/**
 * Draft image policy: how large an attachment may stay before it is shrunk, and how much
 * a draft may carry in total.
 *
 * The gateway refuses a request body over {@link ATTACHMENT_BODY_CEILING_BYTES}, and a
 * phone photo reaches it as base64 inside a JSON envelope. Base64 inflates the bytes by a
 * third, so four full-resolution photos exceed the ceiling before any text is added. The
 * composer therefore shrinks on the device and keeps the draft under a target that leaves
 * room for the envelope and the prompt.
 */

/** Attachments one message may carry; matches the desktop composer's limit. */
export const MAX_ATTACHMENTS = 4

/** Long edge of an attached image after shrinking. */
export const ATTACHMENT_MAX_EDGE = 1600

/** JPEG quality of an attached image after shrinking. */
export const ATTACHMENT_QUALITY = 0.7

/** The gateway's request-body ceiling (`MAX_BODY_BYTES` in `dsh-mobile-bridge`). */
export const ATTACHMENT_BODY_CEILING_BYTES = 12 * 1024 * 1024

/**
 * Draft budget kept clear of the ceiling: base64 and the prompt envelope share the body,
 * and a refusal at the gateway reaches the reader as a failed send rather than a reason.
 */
export const ATTACHMENT_DRAFT_BUDGET_BYTES = 9 * 1024 * 1024

/** Smallest shrink worth re-encoding for; below this the photo is already light. */
export function resizeTargetFor(width: number, height: number): { height: number; width: number } | undefined {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return undefined
  const longEdge = Math.max(width, height)
  if (longEdge <= ATTACHMENT_MAX_EDGE) return undefined
  const scale = ATTACHMENT_MAX_EDGE / longEdge
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/** Decoded size of a base64 payload; the four-character tail carries one or two pads. */
export function base64Bytes(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding)
}

/**
 * Reports whether a draft still fits the send budget.
 *
 * @param attachments - Draft attachments carrying their encoded size in bytes.
 * @returns True when the encoded total stays inside {@link ATTACHMENT_DRAFT_BUDGET_BYTES}.
 */
export function attachmentsWithinBudget(attachments: ReadonlyArray<{ bytes: number }>): boolean {
  return attachmentBytes(attachments) <= ATTACHMENT_DRAFT_BUDGET_BYTES
}

/** Summed encoded size of the draft attachments. */
export function attachmentBytes(attachments: ReadonlyArray<{ bytes: number }>): number {
  return attachments.reduce((total, attachment) => total + Math.max(0, attachment.bytes), 0)
}

/** Formats a byte count the way the composer's draft summary prints it. */
export function formatAttachmentBytes(bytes: number): string {
  if (bytes < 1024) return `${Math.max(0, Math.round(bytes))} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
