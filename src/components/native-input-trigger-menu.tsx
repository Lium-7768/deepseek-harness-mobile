import { NativeMenuPanel, type NativeMenuGroup } from '@/components/native-menu-panel'
import { commandTrigger, rankSlashSources, type CommandTrigger } from '@/components/input-trigger-logic'
import { t as message } from '@/locale'
import type { MobileCommandDescriptor, MobileSkillDescriptor } from '@/types/mobile'

/** What a `/` pick inserts: the name, whichever source offered it. */
export interface SlashPick {
  name: string
}

/**
 * Renders the `/` menu over the composer.
 *
 * The Web opens `conversation.input.overlay` once a slash begins a token and
 * fills it from two sources: the Host's commands and its user-invocable skills.
 * The phone keeps one menu and one pick result — `/name ` — because the Host
 * decides what a leading `/name` line means when the prompt arrives.
 *
 * @param props - The draft, the caret that drives detection, both candidate lists, and the pick handler.
 * @returns The menu, or `null` while no trigger is open or nothing matches.
 */
export function NativeInputTriggerMenu({
  commands,
  skills,
  text,
  caret,
  onClose,
  onPick,
}: {
  /** Host commands, or undefined until the catalog loads. */
  commands: MobileCommandDescriptor[] | undefined
  /** User-invocable skills, or undefined until the catalog loads. */
  skills?: MobileSkillDescriptor[]
  /** The whole draft. */
  text: string
  /** Selection start from the input's own selection event. */
  caret: number
  onClose: () => void
  /** Receives the chosen name and the trigger span it replaces. */
  onPick: (picked: SlashPick, trigger: CommandTrigger) => void
}): React.JSX.Element | null {
  const trigger = commandTrigger(text, caret)
  if (trigger === undefined) return null
  const ranked = rankSlashSources(commands ?? [], skills ?? [], trigger.query)
  const matches = ranked.commands
  const skillMatches = ranked.skills
  if (matches.length === 0 && skillMatches.length === 0) return null
  const groups: NativeMenuGroup[] = [
    {
      options: matches.map((command) => ({
        description: command.description,
        label: command.name,
        token: `/${command.name}`,
        value: command.name,
      })),
      title: message('composer.menuCommandSection'),
    },
    {
      options: skillMatches.map((skill) => ({
        description: skill.modelInvocable
          ? skill.description
          : `${message('composer.skillUserOnly')} · ${skill.description}`,
        label: skill.name,
        token: `/${skill.name}`,
        value: `skill:${skill.name}`,
      })),
      title: message('composer.menuSkillSection'),
    },
  ].filter((group) => group.options.length > 0)
  return (
    <NativeMenuPanel
      actionMenu
      groups={groups}
      onClose={onClose}
      onSelect={(value) => {
        const name = value.startsWith('skill:') ? value.slice('skill:'.length) : value
        const picked =
          matches.find((command) => command.name === name) ?? skillMatches.find((skill) => skill.name === name)
        if (picked !== undefined) onPick({ name: picked.name }, trigger)
      }}
      open
      title={message('composer.menuSlashSection')}
    />
  )
}
