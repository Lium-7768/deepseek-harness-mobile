import { Platform } from 'react-native'

/**
 * Haptic cues for actions that change something.
 *
 * A phone has no visible pointer, so a light tap is often the only confirmation that a
 * control fired. Cues stay out of scrolling, typing and rendering: a buzz per gesture
 * would read as noise rather than feedback.
 *
 * Every call swallows its own failure. Low Power Mode and a disabled Taptic Engine both
 * make these throw, and a missing buzz must never break the action that produced it.
 *
 * The engine loads on the first cue: an Expo package reaches its runtime on import, which
 * a Node test process cannot satisfy, and a cue is only wanted after a real interaction.
 */

/** Platform gate kept separate so the tests can assert the web never reaches the engine. */
function hapticsSupported(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android'
}

/**
 * Confirms an action the reader just took: a copy, a send, a selection.
 *
 * @returns Nothing; a failure inside the engine is swallowed.
 */
export function tapFeedback(): void {
  if (!hapticsSupported()) return
  void import('expo-haptics')
    .then((engine) => engine.impactAsync(engine.ImpactFeedbackStyle.Light))
    .catch(() => undefined)
}

/**
 * Marks a destructive or irreversible step, such as stopping a turn or confirming a delete.
 *
 * @returns Nothing; a failure inside the engine is swallowed.
 */
export function warnFeedback(): void {
  if (!hapticsSupported()) return
  void import('expo-haptics')
    .then((engine) => engine.notificationAsync(engine.NotificationFeedbackType.Warning))
    .catch(() => undefined)
}

/**
 * Announces that something the reader was waiting for finished.
 *
 * A turn runs for minutes on a phone that is often in a hand rather than on screen;
 * the success pattern is the one cue that reaches the holder without a look.
 *
 * @returns Nothing; a failure inside the engine is swallowed.
 */
export function doneFeedback(): void {
  if (!hapticsSupported()) return
  void import('expo-haptics')
    .then((engine) => engine.notificationAsync(engine.NotificationFeedbackType.Success))
    .catch(() => undefined)
}
