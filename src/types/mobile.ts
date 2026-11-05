export interface MobileConnection {
  gatewayUrl: string
  deviceId: string
  accessToken: string
}

/** A short-lived desktop-issued QR payload that can be exchanged only once for a paired-device credential. */
export interface MobilePairingQrPayload {
  version: 1
  gatewayUrl: string
  pairingId: string
  pairingSecret: string
  expiresAt: string
}

/** The durable credential returned only after a pairing QR payload is redeemed. */
export interface MobilePairingCredential {
  deviceId: string
  accessToken: string
}

/** Image MIME types accepted by the desktop session.prompt API. */
export type MobileImageMediaType = 'image/gif' | 'image/jpeg' | 'image/png' | 'image/webp'

/** A native-composer content block forwarded unchanged by the Mobile Gateway. */
export type MobilePromptContentPart =
  { type: 'text'; text: string } | { type: 'image'; mediaType: MobileImageMediaType; data: string; name?: string }

export type MobilePromptContent = MobilePromptContentPart[]

/** One host-owned pending inbox item projected from a DSH `session/queue` mux frame. */
export interface MobileQueueItem {
  id: string
  placement: 'context' | 'queued' | 'steering'
  message: { content: MobilePromptContent }
}

export interface MobileQueuePayload {
  items: MobileQueueItem[]
}

/** One versioned event forwarded by the authenticated Mobile Gateway SSE stream. */
export interface MobileStreamEvent {
  contractVersion: 1
  eventId: string
  type: string
  payload: Record<string, unknown>
  sessionId?: string
  seq?: number
  snapshot?: true
}

export type MobileSyncStatus = 'connected' | 'connecting' | 'disconnected'

export interface SessionSummary {
  sessionId: string
  title?: string
  running?: boolean
  updatedAt?: number
  blank?: boolean
  agentPreset?: string
  [key: string]: unknown
}

/** Desktop-owned workspace membership projected with the mobile session list. */
export interface MobileWorkspace {
  workspaceId: string
  title: string
  path?: string
  sessionIds: string[]
}

export interface SessionListPayload {
  items: SessionSummary[]
  workspaces: MobileWorkspace[]
  archivedSessionIds: string[]
}

/** Lightweight desktop running-session snapshot used only to establish live event subscriptions. */
export interface MobileRunningSessionsPayload {
  sessionIds: string[]
}

/** One desktop search hit. Session title and workspace metadata stay owned by SessionListPayload. */
export interface MobileSessionSearchItem {
  sessionId: string
  snippet: string
}

export interface MobileSessionSearchPayload {
  items: MobileSessionSearchItem[]
  hasMore: boolean
}

/** A durable image only retrievable after the desktop proves the current session references it. */
export interface MobileImageAttachmentRef {
  attachmentId: string
  mediaType: MobileImageMediaType
  bytes: number
  width: number
  height: number
  name?: string
}

export interface MobileImageAttachmentPayload {
  attachment: MobileImageAttachmentRef
  data: string
}

export interface SessionHistoryItem {
  seq?: number
  event: Record<string, unknown>
  /** Host-computed desktop tool-card view that clients may render without echoing it back. */
  view?: unknown
  [key: string]: unknown
}

export interface SessionHistoryPayload {
  items: SessionHistoryItem[]
  hasMore?: boolean
  projections?: MobileSessionProjectionsBlock
  [key: string]: unknown
}

/** Session projection baseline returned with the history tail. */
export interface MobileSessionProjectionsBlock {
  asOfSeq: number
  values: Record<string, unknown>
}

/** Goal lifecycle is desktop-authoritative; live reads additionally carry process-local activation. */
export interface MobileGoalView {
  id: string
  revision: number
  objective: string
  phase: 'active' | 'paused' | 'blocked' | 'complete'
  /** Live host continuation authority; never inferred from the durable phase. */
  activation?: 'armed' | 'disarmed'
  blockedReason?: { message?: string }
}

/** One read-only host-owned background-job snapshot row. */
export interface MobileJobView {
  id: string
  kind: string
  label: string
  status: string
  detail?: string
  startedAt: number
  finishedAt?: number
}

export interface MobileJobsPayload {
  items: MobileJobView[]
}

/** Desktop-owned direct child session that belongs to one parent session. */
export type MobileSubagentEntry =
  | {
      kind: 'child'
      id: string
      mode: 'one-shot' | 'continuable'
      activity: 'running' | 'inactive'
      label?: string
    }
  | { kind: 'diagnostic'; id: string; reason: 'corrupt' | 'unsupported' | 'unavailable' }

export interface MobileSubagentCatalogPayload {
  entries: MobileSubagentEntry[]
  parentAvailable: boolean
}

export interface MobileGoalRef {
  id: string
  revision: number
}

/** Host-owned permission choices projected from the session log. */
export interface MobilePermissionSelect {
  options: Array<{ value: string; name: string; description?: string }>
  currentValue: string
}

export interface MobileGatewayFault {
  error: {
    code: string
    message: string
  }
}

export interface SessionEventItem extends SessionHistoryItem {
  event: Record<string, unknown>
}

export interface SessionEventsPayload {
  since: number
  items: SessionEventItem[]
  status: 'running' | 'waiting' | 'idle'
  /** Local cache boundary; earlier events remain available through desktop history pagination. */
  windowStartSeq?: number
}

/** One Gateway-issued hydration lease that transfers a session from durable snapshot to live events. */
export interface MobileSessionSubscriptionPayload {
  subscriptionId: string
  activationToken: string
  snapshotSeq: number
  cutoverEventId: string
  snapshot: {
    items: SessionEventItem[]
    status: SessionEventsPayload['status']
    interactions: PendingInteraction[]
    queue: MobileQueuePayload
    jobs: MobileJobsPayload
  }
}

export interface DshQuestionOption {
  label: string
  description?: string
}

export interface DshQuestion {
  id: string
  question: string
  detail?: string
  header?: string
  options?: DshQuestionOption[]
  multiSelect?: boolean
  intent?: { kind?: string; approve?: string }
}

export interface PendingApprovalInteraction {
  rpcId: string
  type: 'approval/requested'
  sessionId: string
  receivedAt: string
  payload: {
    type: 'approval/requested'
    sessionId: string
    approvalId: string
    toolName: string
    callId?: string
    reason?: string
  }
}

export interface PendingQuestionInteraction {
  rpcId: string
  type: 'question/requested'
  sessionId: string
  receivedAt: string
  payload: {
    type: 'question/requested'
    sessionId: string
    questions: DshQuestion[]
  }
}

export type PendingInteraction = PendingApprovalInteraction | PendingQuestionInteraction

export interface PendingInteractionsPayload {
  items: PendingInteraction[]
}

export interface MobileSettingsSecretView {
  path: string[]
  set: boolean
}

export interface MobileSettingsNamespaceView {
  ns: string
  schema: unknown
  value: unknown
  base?: unknown
  user?: unknown
  applies: 'live' | 'restart'
  secrets: MobileSettingsSecretView[]
  revision: number
}

export interface MobileSettingsPayload {
  writable: boolean
  hasDocument: boolean
  namespaces: MobileSettingsNamespaceView[]
}

export interface MobileSettingsPathOp {
  op: 'set' | 'unset'
  path: string[]
  value?: unknown
}

export interface MobileSettingsUpdatePayload {
  ns: string
  patch: Record<string, unknown>
  expectedRevision?: number
}

export interface MobileSettingsMutatePayload {
  ns: string
  ops: MobileSettingsPathOp[]
  expectedRevision?: number
}

export interface MobileModelReasoningEffort {
  id: string
  name: string
  description?: string
}

export interface MobileModelCatalogModel {
  id: string
  name: string
  description?: string
  reasoning?: {
    efforts: MobileModelReasoningEffort[]
    defaultEffort?: string
  }
}

export interface MobileModelProviderGroup {
  id: string
  name: string
  models: MobileModelCatalogModel[]
}

export interface MobileModelCatalogFailure {
  id: string
  name: string
  message: string
}

export interface MobileModelCatalogPayload {
  groups: MobileModelProviderGroup[]
  failures: MobileModelCatalogFailure[]
}

export interface MobileSessionModelsPayload {
  current: MobileModelSelection
  routable: boolean
  groups: MobileModelProviderGroup[]
  failures: MobileModelCatalogFailure[]
}

/** Complete provider/model route selected for the next session turn. */
export interface MobileModelSelection {
  provider: string
  model: string
  reasoningEffort?: string
}

export interface MobileAgentPresetEntry {
  id: string
  isDefault: boolean
  name?: string
  description?: string
  broken?: string
}

export interface MobileAgentPresetListPayload {
  presets: MobileAgentPresetEntry[]
  authorable: boolean
  hasDocument: boolean
}

export interface MobileAgentPresetDetail {
  agentPreset: string
  content: string
  name?: string
  description?: string
}

/** Overall positive or negative judgment of one assistant message. */
export type MobileFeedbackRating = 'positive' | 'negative'

/** One current desktop-owned feedback value and its opaque mutation token. */
export interface MobileFeedbackItem {
  /** Stable identity of the assistant message inside the owning session. */
  messageId: string
  /** Overall positive or negative judgment. */
  rating: MobileFeedbackRating
  /** Optional explanation, preserved verbatim after validation. */
  note?: string
  /** Equality-only token replaced by every material create or update. */
  version: string
  /** Host-assigned creation time in Unix epoch milliseconds. */
  createdAt: number
  /** Host-assigned time of the most recent material update. */
  updatedAt: number
}

/** Idempotent deletion acknowledgement. */
export interface MobileFeedbackDeleteValue {
  absent: true
}

/** Rejected business result with a stable desktop feedback failure. */
export interface MobileFeedbackRejected<E = Record<string, unknown>> {
  ok: false
  error: E
}

/** Result of listing the feedback committed to one session's desktop sidecar. */
export type MobileFeedbackListResult =
  | { ok: true; value: { items: MobileFeedbackItem[] } }
  | MobileFeedbackRejected<{ code: 'session-not-found'; sessionId: string }>

/** Result of creating or replacing feedback for one assistant message. */
export type MobileFeedbackPutResult =
  | { ok: true; value: MobileFeedbackItem }
  | MobileFeedbackRejected<
      | { code: 'session-not-found'; sessionId: string }
      | { code: 'target-not-found'; sessionId: string; messageId: string }
      | { code: 'version-conflict'; current: MobileFeedbackItem | null }
      | { code: 'note-blank' }
      | { code: 'note-too-large'; maxBytes: number; actualBytes: number }
    >

/** Result of deleting feedback for one assistant message. */
export type MobileFeedbackDeleteResult =
  | { ok: true; value: MobileFeedbackDeleteValue }
  | MobileFeedbackRejected<
      | { code: 'session-not-found'; sessionId: string }
      | { code: 'version-conflict'; current: MobileFeedbackItem | null }
    >

/** Read-only task catalog and optimistic update reference owned by the desktop schedule service. */
export interface MobileScheduleEntry {
  id: string
  title: string
  prompt: string
  status: 'active' | 'paused' | 'ended'
  scheduledAt: string
  updatedAt?: string
  target: { kind: 'session' | 'new_once'; sessionId: string } | { kind: 'new' }
  executionActive?: boolean
}

/** One slash command the desktop advertises for a session. */
export interface MobileCommandDescriptor {
  /** Lowercase command name without the leading slash. */
  name: string
  /** One-line summary the discovery menu prints. */
  description: string
}

/** One currency wallet on the desktop's account. */
export interface MobileAccountWallet {
  currency: 'CNY' | 'USD'
  balance: string
}

/** Account wallets the desktop published; bonuses are listed apart from top-ups. */
export interface MobileAccountBalance {
  wallets: MobileAccountWallet[]
  bonusWallets: MobileAccountWallet[]
}

/** Signed-in identity the desktop published; every field may be masked or absent. */
export interface MobileAccountProfile {
  name: string | null
  contact: string | null
  avatarUrl: string | null
}
