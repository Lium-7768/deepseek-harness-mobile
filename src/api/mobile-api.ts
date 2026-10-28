import type {
  MobileAgentPresetDetail,
  MobileAgentPresetListPayload,
  MobileFeedbackDeleteResult,
  MobileFeedbackListResult,
  MobileFeedbackPutResult,
  MobileFeedbackRating,
  MobileGoalRef,
  MobileImageAttachmentPayload,
  MobileJobsPayload,
  MobileSubagentCatalogPayload,
  MobileConnection,
  MobileGatewayFault,
  MobileModelCatalogPayload,
  MobilePairingCredential,
  MobilePairingQrPayload,
  MobilePromptContent,
  MobileQueuePayload,
  MobileRunningSessionsPayload,
  MobileSettingsMutatePayload,
  MobileSettingsNamespaceView,
  MobileSettingsPayload,
  MobileSettingsUpdatePayload,
  MobileSessionModelsPayload,
  MobileSessionSearchPayload,
  MobileSessionSubscriptionPayload,
  PendingInteractionsPayload,
  SessionEventsPayload,
  SessionHistoryPayload,
  SessionListPayload,
} from '@/types/mobile'
import { format, t as message } from '@/locale'

interface GatewayEnvelope<T> {
  contractVersion: 1
  data: T
}

export type MobileApiErrorKind =
  | 'network'
  | 'credentials'
  | 'pairing-invalid'
  | 'session-not-found'
  | 'desktop-unavailable'
  | 'model-unavailable'
  | 'agent-preset-locked'
  | 'agent-preset-not-found'
  | 'agent-preset-invalid'
  | 'settings-rejected'
  | 'settings-conflict'
  | 'protocol'
  | 'http'
  | 'unknown'

export interface MobileApiDiagnostic {
  kind: MobileApiErrorKind
  code?: string
  status?: number
  rawMessage?: string
}

/** Carries stable Chinese UI text separately from gateway and network diagnostics. */
export class MobileApiError extends Error {
  readonly kind: MobileApiErrorKind
  readonly userMessage: string
  readonly diagnostic: MobileApiDiagnostic

  /**
   * @param kind - Stable category used for diagnostics and UI policy.
   * @param userMessage - Chinese text safe for direct user presentation.
   * @param diagnostic - Original gateway or network details for diagnostics.
   */
  constructor(kind: MobileApiErrorKind, userMessage: string, diagnostic: Omit<MobileApiDiagnostic, 'kind'> = {}) {
    super(userMessage)
    this.name = 'MobileApiError'
    this.kind = kind
    this.userMessage = userMessage
    this.diagnostic = { kind, ...diagnostic }
  }
}

/**
 * Returns safe Chinese UI text without exposing an unknown English exception.
 * @param error - Unknown failure received from a request or local operation.
 * @param fallback - Chinese text used when the failure is not recognized.
 * @returns Chinese text suitable for a user-facing error surface.
 */
export function mobileErrorMessage(error: unknown, fallback = message('errors.requestFailed')): string {
  if (error instanceof MobileApiError) return error.userMessage
  if (error instanceof Error && containsChinese(error.message)) return error.message
  return fallback
}

/** Builds the device-bound bearer value required by every authenticated Mobile Gateway route. */
export function mobileAuthorization(connection: Pick<MobileConnection, 'deviceId' | 'accessToken'>): string {
  return `Bearer ${connection.deviceId}.${connection.accessToken}`
}

/** Exchanges a desktop-issued short-lived QR payload for one durable mobile device credential. */
export async function redeemMobilePairing(payload: MobilePairingQrPayload): Promise<MobileConnection> {
  let gatewayUrl: string
  try {
    const parsed = new URL(payload.gatewayUrl)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('unsupported protocol')
    gatewayUrl = parsed.toString().replace(/\/$/, '')
  } catch (error) {
    throw createError('protocol', message('errors.qrGatewayInvalid'), { rawMessage: rawMessage(error) }, false)
  }
  const expiresAt = Date.parse(payload.expiresAt)
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now())
    throw createError('pairing-invalid', message('errors.pairingExpired'), {}, false)
  let response: Response
  try {
    response = await fetch(`${gatewayUrl}/v1/pairing/redeem`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pairingId: payload.pairingId, pairingSecret: payload.pairingSecret }),
    })
  } catch (error) {
    throw createError('network', message('errors.pairingUnreachable'), { rawMessage: rawMessage(error) })
  }
  let decoded: unknown
  try {
    decoded = await response.json()
  } catch (error) {
    throw createError('protocol', message('errors.pairingResponseInvalid'), { status: response.status, rawMessage: rawMessage(error) })
  }
  if (!response.ok) {
    const fault = readGatewayFault(decoded)
    const code = fault?.code
    const kind = errorKind(code, response.status)
    throw createError(kind, userMessage(kind, code, response.status, fault?.message), {
      code,
      status: response.status,
      rawMessage: fault?.message,
    })
  }
  if (!isGatewayEnvelope<MobilePairingCredential>(decoded) || !isPairingCredential(decoded.data))
    throw createError('protocol', message('errors.pairingResponseInvalid'), { status: response.status })
  return { gatewayUrl, deviceId: decoded.data.deviceId, accessToken: decoded.data.accessToken }
}

/**
 * One desktop-published address plus the password that address accepts.
 *
 * Typed entry is the primary way in: the desktop shows a public address and a
 * password, and the user types both. It needs no camera and survives a desktop
 * restart that rotates the address.
 */
export interface MobilePasswordLogin {
  /** Public base URL the desktop published, without a trailing slash. */
  gatewayUrl: string
  /** Password the desktop is currently accepting. */
  password: string
}

/**
 * Exchanges a typed address and password for one durable mobile device credential.
 *
 * The gateway answers with the same `{ deviceId, accessToken }` envelope a
 * redeemed pairing returns, so the stored connection is identical either way.
 *
 * @param login - Desktop address and password as typed by the user.
 * @returns The stored connection shape, including the normalized gateway URL.
 */
export async function authenticateMobilePassword(login: MobilePasswordLogin): Promise<MobileConnection> {
  let gatewayUrl: string
  try {
    const parsed = new URL(login.gatewayUrl)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('unsupported protocol')
    gatewayUrl = parsed.toString().replace(/\/$/, '')
  } catch (error) {
    throw createError('protocol', message('errors.addressInvalid'), { rawMessage: rawMessage(error) }, false)
  }
  const password = login.password.trim()
  if (password === '') throw createError('credentials', message('errors.passwordRequired'), {}, false)
  let response: Response
  try {
    response = await fetch(`${gatewayUrl}/v1/auth`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    })
  } catch (error) {
    throw createError('network', message('errors.addressUnreachable'), { rawMessage: rawMessage(error) })
  }
  let decoded: unknown
  try {
    decoded = await response.json()
  } catch (error) {
    throw createError('protocol', message('errors.loginResponseInvalid'), { status: response.status, rawMessage: rawMessage(error) })
  }
  if (!response.ok) {
    const fault = readGatewayFault(decoded)
    const code = fault?.code
    const kind = errorKind(code, response.status)
    // Never report this failure: a gateway that echoes the rejected password in
    // its fault message would otherwise write that password to the device log.
    throw createError(
      kind,
      userMessage(kind, code, response.status, fault?.message),
      { code, status: response.status, rawMessage: fault?.code === undefined ? undefined : fault.message },
      false,
    )
  }
  if (!isGatewayEnvelope<MobilePairingCredential>(decoded) || !isPairingCredential(decoded.data))
    throw createError('protocol', message('errors.loginResponseInvalid'), { status: response.status }, false)
  return { gatewayUrl, deviceId: decoded.data.deviceId, accessToken: decoded.data.accessToken }
}

/** Calls only the versioned Mobile Gateway API with a paired-device credential. */
export class MobileApi {
  readonly #connection: MobileConnection

  /** @param connection - A desktop-issued device credential and Gateway URL. */
  constructor(connection: MobileConnection) {
    let parsed: URL
    try {
      parsed = new URL(connection.gatewayUrl)
    } catch (error) {
      throw createError('unknown', message('errors.gatewayInvalid'), { rawMessage: rawMessage(error) }, false)
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')
      throw createError(
        'protocol',
        message('errors.gatewayProtocol'),
        { rawMessage: `unsupported protocol ${parsed.protocol}` },
        false,
      )
    this.#connection = { ...connection, gatewayUrl: parsed.toString().replace(/\/$/, '') }
  }

  /** Loads the sessions shown by the current DSH Web sidebar. */
  listSessions(): Promise<SessionListPayload> {
    return this.#post<SessionListPayload>('/v1/sessions/list', {})
  }

  /** Reads only the running desktop session identifiers needed to establish live subscriptions. */
  runningSessions(): Promise<MobileRunningSessionsPayload> {
    return this.#post<MobileRunningSessionsPayload>('/v1/sessions/running', {})
  }

  /** Searches the desktop-visible user, assistant, and steering message surface. */
  searchSessions(query: string): Promise<MobileSessionSearchPayload> {
    return this.#post<MobileSessionSearchPayload>('/v1/sessions/search', { query })
  }

  /** Loads one durable session-history page from the desktop runtime. */
  sessionHistory(
    sessionId: string,
    options: { beforeSeq?: number; maxMessages?: number } = {},
  ): Promise<SessionHistoryPayload> {
    return this.#post<SessionHistoryPayload>(`/v1/sessions/${encodeURIComponent(sessionId)}/history`, options)
  }

  /** Creates a desktop-owned session, optionally in one existing workspace. */
  createSession(input: { workspaceId?: string; cwd?: string; agentPreset?: string } = {}): Promise<{ sessionId: string }> {
    return this.#post<{ sessionId: string }>('/v1/sessions/create', input)
  }

  /** Renames one desktop-owned session. */
  renameSession(sessionId: string, title: string): Promise<{ title: string; seq: number }> {
    return this.#post(`/v1/sessions/${encodeURIComponent(sessionId)}/rename`, { title })
  }

  /** Forks one desktop-owned session at an optional durable event sequence. */
  forkSession(sessionId: string, atSeq?: number): Promise<{ sessionId: string }> {
    return this.#post(`/v1/sessions/${encodeURIComponent(sessionId)}/fork`, {
      ...(atSeq === undefined ? {} : { atSeq }),
    })
  }

  /** Archives one desktop-owned session through the workspace service. */
  archiveSession(sessionId: string): Promise<{ archivedSessionIds: string[] }> {
    return this.#post(`/v1/sessions/${encodeURIComponent(sessionId)}/archive`, {})
  }

  /** Reads one durable image only after the desktop proves the current session references it. */
  readAttachment(sessionId: string, attachmentId: string): Promise<MobileImageAttachmentPayload> {
    return this.#post(
      `/v1/sessions/${encodeURIComponent(sessionId)}/attachments/${encodeURIComponent(attachmentId)}`,
      {},
    )
  }

  /** Renames one desktop-owned workspace without changing its directory path. */
  renameWorkspace(workspaceId: string, title: string): Promise<{ workspace: unknown }> {
    return this.#post(`/v1/workspaces/${encodeURIComponent(workspaceId)}/rename`, { title })
  }

  /** Removes one desktop workspace registration while preserving its directory and session logs. */
  deleteWorkspace(workspaceId: string): Promise<{ deleted: true }> {
    return this.#post(`/v1/workspaces/${encodeURIComponent(workspaceId)}/delete`, {})
  }

  /** Reads the desktop mux-derived pending inbox snapshot for one session. */
  sessionQueue(sessionId: string): Promise<MobileQueuePayload> {
    return this.#post<MobileQueuePayload>(`/v1/sessions/${encodeURIComponent(sessionId)}/queue`, {})
  }

  /** Reads the host-owned background-job snapshot for one desktop session. */
  sessionJobs(sessionId: string): Promise<MobileJobsPayload> {
    return this.#post<MobileJobsPayload>(`/v1/sessions/${encodeURIComponent(sessionId)}/jobs`, {})
  }

  /** Lists direct desktop-owned subagent sessions without activating either agent. */
  subagents(sessionId: string): Promise<MobileSubagentCatalogPayload> {
    return this.#post<MobileSubagentCatalogPayload>(`/v1/sessions/${encodeURIComponent(sessionId)}/subagents`, {})
  }

  /** Reads a direct child transcript through the desktop subagent authority. */
  subagentHistory(
    parentSessionId: string,
    childSessionId: string,
    mode: 'one-shot' | 'continuable',
  ): Promise<SessionHistoryPayload> {
    return this.#post<SessionHistoryPayload>(
      `/v1/sessions/${encodeURIComponent(parentSessionId)}/subagents/${encodeURIComponent(childSessionId)}/history`,
      { mode },
    )
  }

  /** Queues native text and image content through the desktop's direct-parent subagent authority. */
  sendSubagentMessage(parentSessionId: string, childSessionId: string, content: MobilePromptContent): Promise<{ messageId: string }> {
    return this.#post(`/v1/sessions/${encodeURIComponent(parentSessionId)}/subagents/${encodeURIComponent(childSessionId)}/messages`, {
      mode: 'continuable',
      content,
    })
  }

  /** Requests interruption of a continuable child turn; acceptance does not imply immediate quiescence. */
  interruptSubagent(parentSessionId: string, childSessionId: string): Promise<{ accepted: true }> {
    return this.#post(`/v1/sessions/${encodeURIComponent(parentSessionId)}/subagents/${encodeURIComponent(childSessionId)}/interrupt`, {
      mode: 'continuable',
    })
  }

  /** Applies one desktop Goal mutation using the projection's current CAS reference. */
  mutateGoal(
    sessionId: string,
    action: 'edit' | 'pause' | 'resume' | 'clear',
    ref: MobileGoalRef,
    input: { objective?: string } = {},
  ): Promise<{ ref?: MobileGoalRef; cleared?: true }> {
    return this.#post(`/v1/sessions/${encodeURIComponent(sessionId)}/goal/${action}`, { ref, ...input })
  }

  /** Updates one queued prompt using an existing DSH queue action. */
  updateQueue(sessionId: string, itemId: string, action: Record<string, unknown>): Promise<{ accepted: true }> {
    return this.#post(`/v1/sessions/${encodeURIComponent(sessionId)}/queue/${encodeURIComponent(itemId)}`, { action })
  }

  /** Polls new session events and derives the current status. */
  sessionEvents(sessionId: string, since: number): Promise<SessionEventsPayload> {
    return this.#post<SessionEventsPayload>(`/v1/sessions/${encodeURIComponent(sessionId)}/events`, { since })
  }

  /** Creates one session-scoped snapshot lease before the live stream may deliver newer events. */
  createSessionSubscription(sessionId: string, lastSeenSeq: number): Promise<MobileSessionSubscriptionPayload> {
    return this.#post<MobileSessionSubscriptionPayload>(
      `/v1/sessions/${encodeURIComponent(sessionId)}/subscriptions`,
      { lastSeenSeq },
    )
  }

  /** Confirms that the native cache committed one subscription snapshot and may now receive its buffered events. */
  activateSessionSubscription(
    subscriptionId: string,
    activationToken: string,
    appliedSnapshotSeq: number,
  ): Promise<{ activated: true }> {
    return this.#post<{ activated: true }>(`/v1/subscriptions/${encodeURIComponent(subscriptionId)}/activate`, {
      activationToken,
      appliedSnapshotSeq,
    })
  }

  /** Reads only the current approval and question requests for one DSH session. */
  pendingInteractions(sessionId: string): Promise<PendingInteractionsPayload> {
    return this.#post<PendingInteractionsPayload>(`/v1/sessions/${encodeURIComponent(sessionId)}/interactions`, {})
  }

  /** Sends a correlated response to a pending DSH interaction. */
  respondToInteraction(rpcId: string, result: unknown): Promise<unknown> {
    return this.#post('/v1/interactions/respond', { rpcId, result })
  }

  /** Queues native text and image content in the selected desktop-owned session. */
  sendMessage(sessionId: string, content: MobilePromptContent): Promise<unknown> {
    return this.#post(`/v1/sessions/${encodeURIComponent(sessionId)}/messages`, { content })
  }

  /** Requests cancellation of the selected DSH session. */
  cancelSession(sessionId: string): Promise<unknown> {
    return this.#post(`/v1/sessions/${encodeURIComponent(sessionId)}/cancel`, {})
  }

  /** Reads redacted settings namespaces supported by the desktop runtime. */
  settingsDescribe(): Promise<MobileSettingsPayload> {
    return this.#post<MobileSettingsPayload>('/v1/settings/describe', {})
  }

  /** Updates one mobile-safe settings namespace through the desktop settings seam. */
  settingsUpdate(request: MobileSettingsUpdatePayload): Promise<MobileSettingsNamespaceView> {
    return this.#post<MobileSettingsNamespaceView>('/v1/settings/update', request)
  }

  /** Applies path-addressed edits without replacing redacted secret fields. */
  settingsMutate(request: MobileSettingsMutatePayload): Promise<MobileSettingsNamespaceView> {
    return this.#post<MobileSettingsNamespaceView>('/v1/settings/mutate', request)
  }

  /** Reads the desktop provider directory for the model settings view. */
  llmProviders(): Promise<{
    providers: Array<{
      provider: string
      displayName: string
      settingsNs: string
      settingsPath: string[]
      active: boolean
      declared?: boolean
    }>
  }> {
    return this.#post('/v1/llm/providers', {})
  }

  /** Reads the host-scoped model catalog for provider/model pickers. */
  llmModels(): Promise<MobileModelCatalogPayload> {
    return this.#post<MobileModelCatalogPayload>('/v1/llm/models', {})
  }

  /** Reads the exact model selection and catalog for one session. */
  sessionModels(sessionId: string): Promise<MobileSessionModelsPayload> {
    return this.#post<MobileSessionModelsPayload>(`/v1/sessions/${encodeURIComponent(sessionId)}/models`, {})
  }

  /** Selects a model route; the desktop API records the selection in the session log. */
  selectSessionModel(
    sessionId: string,
    selection: { provider: string; model: string; reasoningEffort?: string },
  ): Promise<{ selected: MobileSessionModelsPayload['current'] }> {
    return this.#post(`/v1/sessions/${encodeURIComponent(sessionId)}/model`, selection)
  }

  /** Lists Agent presets available for new or still-blank sessions. */
  agentPresets(): Promise<MobileAgentPresetListPayload> {
    return this.#post<MobileAgentPresetListPayload>('/v1/agent-presets/list', {})
  }

  /** Reads one preset composition for a read-only mobile detail view. */
  agentPreset(agentPreset: string): Promise<MobileAgentPresetDetail> {
    return this.#post<MobileAgentPresetDetail>('/v1/agent-presets/read', { agentPreset })
  }

  /** Selects an Agent preset; the desktop API appends the durable selection event. */
  selectSessionPreset(sessionId: string, agentPreset: string): Promise<{ agentPreset: string }> {
    return this.#post(`/v1/sessions/${encodeURIComponent(sessionId)}/agent-preset`, { agentPreset })
  }

  /** Reads all desktop-committed feedback for one session, in first-creation order. */
  listFeedback(sessionId: string): Promise<MobileFeedbackListResult> {
    return this.#post<MobileFeedbackListResult>(`/v1/sessions/${encodeURIComponent(sessionId)}/feedback/list`, {
      sessionId,
    })
  }

  /** Creates or replaces feedback for one assistant message with the observed version token. */
  putFeedback(
    sessionId: string,
    messageId: string,
    rating: MobileFeedbackRating,
    options: { note?: string; ifVersion: string | null },
  ): Promise<MobileFeedbackPutResult> {
    return this.#post<MobileFeedbackPutResult>(`/v1/sessions/${encodeURIComponent(sessionId)}/feedback/put`, {
      sessionId,
      messageId,
      rating,
      ...(options.note === undefined ? {} : { note: options.note }),
      ifVersion: options.ifVersion,
    })
  }

  /** Deletes feedback for one assistant message after observing its current version. */
  deleteFeedback(sessionId: string, messageId: string, ifVersion: string): Promise<MobileFeedbackDeleteResult> {
    return this.#post<MobileFeedbackDeleteResult>(`/v1/sessions/${encodeURIComponent(sessionId)}/feedback/delete`, {
      sessionId,
      messageId,
      ifVersion,
    })
  }

  async #post<T>(path: string, body: object): Promise<T> {
    let response: Response
    try {
      response = await fetch(`${this.#connection.gatewayUrl}${path}`, {
        method: 'POST',
        headers: {
          authorization: mobileAuthorization(this.#connection),
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      })
    } catch (error) {
      throw createError('network', message('errors.network'), { rawMessage: rawMessage(error) })
    }

    let decoded: unknown
    try {
      decoded = await response.json()
    } catch (error) {
      if (response.ok)
        throw createError('protocol', message('errors.responseInvalid'), {
          status: response.status,
          rawMessage: rawMessage(error),
        })
    }
    if (!response.ok) throw this.#httpError(response.status, decoded)
    if (!isGatewayEnvelope<T>(decoded))
      throw createError('protocol', message('errors.responseInvalid'), { status: response.status })
    return decoded.data
  }

  #httpError(status: number, decoded: unknown): MobileApiError {
    const fault = readGatewayFault(decoded)
    const code = fault?.code
    const raw = fault?.message
    const kind = errorKind(code, status)
    return createError(kind, userMessage(kind, code, status, raw), { code, status, rawMessage: raw })
  }
}

function isPairingCredential(value: unknown): value is MobilePairingCredential {
  return isRecord(value) && typeof value.deviceId === 'string' && value.deviceId !== '' && typeof value.accessToken === 'string' && value.accessToken !== ''
}

function isGatewayEnvelope<T>(value: unknown): value is GatewayEnvelope<T> {
  if (!isRecord(value) || value.contractVersion !== 1) return false
  return 'data' in value
}

function readGatewayFault(value: unknown): MobileGatewayFault['error'] | undefined {
  if (!isRecord(value) || !isRecord(value.error)) return undefined
  const code = typeof value.error.code === 'string' ? value.error.code : undefined
  const message = typeof value.error.message === 'string' ? value.error.message : undefined
  return code !== undefined && message !== undefined ? { code, message } : undefined
}

function errorKind(code: string | undefined, status: number): MobileApiErrorKind {
  const normalized = code?.toLowerCase()
  if (
    normalized === 'unauthorized' ||
    normalized === 'forbidden' ||
    normalized?.includes('credential') ||
    status === 401 ||
    status === 403
  )
    return 'credentials'
  if (normalized === 'pairing-not-found') return 'pairing-invalid'
  if (normalized === 'session-not-found' || normalized === 'not-found') return 'session-not-found'
  if (normalized === 'model-unavailable') return 'model-unavailable'
  if (normalized === 'agent-preset-locked') return 'agent-preset-locked'
  if (normalized === 'agent-preset-not-found') return 'agent-preset-not-found'
  if (normalized === 'agent-preset-invalid') return 'agent-preset-invalid'
  if (normalized === 'settings-rejected') return 'settings-rejected'
  if (normalized === 'settings-conflict') return 'settings-conflict'
  if (status === 404) return 'session-not-found'
  if (
    normalized === 'upstream-unavailable' ||
    normalized === 'upstream-rejected' ||
    status === 502 ||
    status === 503 ||
    status === 504
  )
    return 'desktop-unavailable'
  if (normalized === 'bad-request' || (status >= 400 && status < 500)) return 'http'
  return status >= 400 ? 'http' : 'unknown'
}

function userMessage(
  kind: MobileApiErrorKind,
  code: string | undefined,
  status: number,
  raw: string | undefined,
): string {
  if (raw !== undefined && containsChinese(raw)) return raw
  if (kind === 'credentials') return message('errors.credentials')
  if (kind === 'pairing-invalid') return message('errors.pairingInvalid')
  if (kind === 'session-not-found') return message('errors.notFound')
  if (kind === 'model-unavailable') return message('errors.modelUnavailable')
  if (kind === 'agent-preset-locked') return message('errors.agentModeLocked')
  if (kind === 'agent-preset-not-found') return message('errors.agentPresetNotFound')
  if (kind === 'agent-preset-invalid') return message('errors.agentPresetLocked')
  if (kind === 'settings-rejected') return message('errors.settingsRejected')
  if (kind === 'settings-conflict') return message('errors.settingsConflict')
  if (kind === 'desktop-unavailable') return message('errors.desktopUnavailable')
  if (code === 'bad-request') return message('errors.requestInvalid')
  return format('errors.httpFailed', { status })
}

function createError(
  kind: MobileApiErrorKind,
  message: string,
  diagnostic: Omit<MobileApiDiagnostic, 'kind'> = {},
  report = true,
): MobileApiError {
  const error = new MobileApiError(kind, message, diagnostic)
  if (report) console.warn('[mobile-api]', error.diagnostic)
  return error
}

function rawMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function containsChinese(value: string): boolean {
  return /[\u3400-\u9fff]/u.test(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
