import { NativeMenuPanel } from '@/components/native-menu-panel'
import { commandTrigger, rankCommands, type CommandTrigger } from '@/components/input-trigger-logic'
import { t as message } from '@/locale'
import type { MobileCommandDescriptor } from '@/types/mobile'

/**
 * Renders the `/` command menu over the composer.
 *
 * The Web opens `conversation.input.overlay` once a slash begins a token. The
 * native surface reuses the shared menu panel, so the row typography, the
 * monospace slash token, and the dismissal behaviour match every other composer
 * menu; only the candidate list is new.
 *
 * @param props - The draft, the caret that drives detection, and the pick handler.
 * @returns The menu, or `null` while no trigger is open or nothing matches.
 */
export function NativeInputTriggerMenu({
  commands,
  text,
  caret,
  onClose,
  onPick,
}: {
  /** Host commands, or undefined until the catalog loads. */
  commands: MobileCommandDescriptor[] | undefined
  /** The whole draft. */
  text: string
  /** Selection start from the input's own selection event. */
  caret: number
  onClose: () => void
  /** Receives the chosen command and the trigger span it replaces. */
  onPick: (command: MobileCommandDescriptor, trigger: CommandTrigger) => void
}): React.JSX.Element | null {
  const trigger = commandTrigger(text, caret)
  if (trigger === undefined) return null
  const matches = rankCommands(commands ?? [], trigger.query)
  if (matches.length === 0) return null
  return (
    <NativeMenuPanel
      actionMenu
      groups={[
        {
          options: matches.map((command) => ({
            description: command.description,
            label: command.name,
            token: `/${command.name}`,
            value: command.name,
          })),
          title: message('composer.menuCommandSection'),
        },
      ]}
      onClose={onClose}
      onSelect={(value) => {
        const picked = matches.find((command) => command.name === value)
        if (picked !== undefined) onPick(picked, trigger)
      }}
      open
      title={message('composer.menuCommandSection')}
    />
  )
}
