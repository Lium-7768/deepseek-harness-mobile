import { t as message } from '@/locale'
import type { MobileModelReasoningEffort } from '@/types/mobile'

/** Host names take precedence; known ids provide a localized fallback. */
export function reasoningEffortLabel(id: string, choices: readonly MobileModelReasoningEffort[]): string {
  const name = choices.find((choice) => choice.id === id)?.name.trim()
  if (name && name !== id) return name
  const known: Record<string, string> = {
    off: message('model.effortOff'),
    low: message('model.effortLow'),
    medium: message('model.effortMedium'),
    high: message('model.effortHigh'),
  }
  return known[id.toLowerCase()] ?? (name || id)
}

/** Snap touch positions to host-published stops; never invent intermediate effort ids. */
export function effortIndexAtPosition(position: number, width: number, count: number): number {
  const travel = Math.max(1, width - EFFORT_THUMB_SIZE)
  return Math.max(0, Math.min(count - 1, Math.round(((position - EFFORT_THUMB_SIZE / 2) / travel) * (count - 1))))
}

export const EFFORT_THUMB_SIZE = 40
