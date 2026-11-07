/** A live `/` trigger: the command token being typed at the caret. */
export interface CommandTrigger {
  kind: 'command'
  /** The text after the slash, before the caret. Empty right after typing `/`. */
  query: string
  /** Caret offset that ends the token, so a pick can replace exactly this span. */
  start: number
  end: number
}

const TOKEN = /\/([A-Za-z0-9:-]*)$/

/**
 * Detect the `/` trigger at the caret.
 *
 * The Web trigger fires on a slash that begins a token: at the start of the
 * draft, or right after whitespace. A slash inside a word (`a/b`) is prose, not
 * a command, so it stays untouched.
 *
 * @param text - The whole draft.
 * @param caret - Selection start, clamped into the draft.
 * @returns The trigger and the span it covers, or undefined when there is none.
 */
export function commandTrigger(text: string, caret: number): CommandTrigger | undefined {
  const end = Math.max(0, Math.min(caret, text.length))
  const before = text.slice(0, end)
  const match = TOKEN.exec(before)
  if (match === null) return undefined
  const start = end - match[0].length
  // Only a token boundary opens the menu; `a/b` keeps the slash as prose.
  if (start > 0 && !/\s/.test(before[start - 1]!)) return undefined
  return { end, kind: 'command', query: match[1] ?? '', start }
}

/**
 * Replace the trigger span with the picked command.
 *
 * @param text - The whole draft.
 * @param trigger - The trigger being replaced.
 * @param name - The command name to insert, without its slash.
 * @returns The new draft and the caret offset after the inserted token.
 */
export function applyCommandPick(text: string, trigger: CommandTrigger, name: string): { text: string; caret: number } {
  const inserted = `/${name} `
  const next = `${text.slice(0, trigger.start)}${inserted}${text.slice(trigger.end)}`
  return { caret: trigger.start + inserted.length, text: next }
}

/**
 * Rank the commands a partial query matches.
 *
 * Prefix matches come first, then names that merely contain the query, and each
 * band keeps the Host's own order so the list is stable between keystrokes.
 *
 * @param commands - The Host's advertised commands.
 * @param query - The text after the slash.
 * @returns The matching commands, best first.
 */
export function rankCommands<T extends { name: string }>(commands: readonly T[], query: string): T[] {
  const needle = query.trim().toLowerCase()
  if (needle === '') return [...commands]
  const prefix: T[] = []
  const contains: T[] = []
  for (const command of commands) {
    const name = command.name.toLowerCase()
    if (name.startsWith(needle)) prefix.push(command)
    else if (name.includes(needle)) contains.push(command)
  }
  return [...prefix, ...contains]
}

/**
 * Rank both `/` sources into the two groups the menu prints.
 *
 * The Host resolves a leading `/name` line by its own adjudication, and a name
 * that is both a command and a skill resolves to the command. A skill sharing a
 * command's name is therefore dropped: offering it would promise text the Host
 * reads as something else.
 *
 * @param commands - The Host's advertised commands.
 * @param skills - The Session's user-invocable skills.
 * @param query - The text after the slash.
 * @returns The matching commands and skills, best first in each group.
 */
export function rankSlashSources<Command extends { name: string }, Skill extends { name: string }>(
  commands: readonly Command[],
  skills: readonly Skill[],
  query: string,
): { commands: Command[]; skills: Skill[] } {
  const commandNames = new Set(commands.map((command) => command.name))
  return {
    commands: rankCommands(commands, query),
    skills: rankCommands(skills, query).filter((skill) => !commandNames.has(skill.name)),
  }
}
