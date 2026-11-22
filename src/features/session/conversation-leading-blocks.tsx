import { ContextRows } from '@/components/session-workbench'
import { LoadOlderControl } from '@/components/native-load-older-control'
import { NativeAgentActivity } from '@/components/native-agent-activity'
import { NativeTeamTasksRow } from '@/components/native-team-tasks-row'
import type { TeamTask } from '@/components/team-task-logic'
import type { SharedEventItem } from '@/shared/dsh-presentation'
import type { MobileJobView as JobView, MobileSubagentEntry } from '@/types/mobile'

/**
 * The blocks that sit at the visual top of a transcript.
 *
 * They are list content rather than siblings of the list: a block outside the scroll view
 * resizes the viewport whenever it appears, disappears, or re-measures, which moves every
 * visible row. In an inverted list this slot renders above the oldest row, so it reads as
 * the top of the conversation.
 *
 * @param props.tasks - Board tasks for this workspace.
 * @param props.sourceItems - Events the context line summarises.
 * @param props.jobs - Background jobs to report.
 * @param props.subagents - Delegated agents to report.
 * @param props.interruptingId - The subagent being interrupted, if any.
 * @param props.hasMoreHistory - Whether older history can be fetched.
 * @param props.olderState - Whether that fetch is in flight or failed.
 * @param props.onLoadOlder - Requests one older page.
 * @param props.onOpenSubagent - Opens one subagent's conversation.
 * @param props.onInterruptSubagent - Stops one subagent.
 * @returns The top-of-transcript blocks.
 */
export function ConversationLeadingBlocks({
  tasks,
  sourceItems,
  jobs,
  subagents,
  interruptingId,
  hasMoreHistory,
  olderState,
  onLoadOlder,
  onOpenSubagent,
  onInterruptSubagent,
  showOlderControl = true,
}: {
  tasks: TeamTask[]
  sourceItems: SharedEventItem[]
  jobs: JobView[]
  subagents: MobileSubagentEntry[]
  interruptingId: string | undefined
  hasMoreHistory: boolean
  olderState: { pending: boolean; failed: boolean }
  onLoadOlder: () => void
  onOpenSubagent: (entry: MobileSubagentEntry) => void
  onInterruptSubagent: (entry: MobileSubagentEntry) => void
  showOlderControl?: boolean
}): React.JSX.Element {
  return (
    <>
      <NativeTeamTasksRow tasks={tasks} />
      <ContextRows items={sourceItems} />
      <NativeAgentActivity
        jobs={jobs}
        subagents={subagents}
        interruptingId={interruptingId}
        onOpenSubagent={onOpenSubagent}
        onInterruptSubagent={onInterruptSubagent}
      />
      {showOlderControl ? <LoadOlderControl hasMore={hasMoreHistory} onLoad={onLoadOlder} state={olderState} /> : null}
    </>
  )
}
