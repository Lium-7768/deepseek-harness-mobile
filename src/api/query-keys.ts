/** All keys live inside a QueryClient owned by one paired desktop identity. */
const key =
  <const Name extends string>(name: Name) =>
  (...parts: readonly (string | number | undefined)[]) =>
    [name, ...parts] as const

export const queryKeys = {
  sessionList: key('session-list'),
  sessionListForSession: key('session-list-for-session'),
  sessionHistory: key('session-history'),
  // Retain the history prefix for invalidations, but never share data with the full transcript.
  sessionHistoryTail: (sessionId: string | undefined, maxMessages: number) =>
    ['session-history', sessionId, 'tail', maxMessages] as const,
  sessionEvents: key('session-events'),
  sessionQueue: key('session-queue'),
  sessionJobs: key('session-jobs'),
  sessionInteractions: key('session-interactions'),
  sessionSubagents: key('session-subagents'),
  sessionModels: key('session-models'),
  sessionGoal: key('session-goal'),
  agentPresets: key('agent-presets'),
  agentPreset: key('mobile-agent-preset'),
  sessionSearch: key('session-search'),
  sessionAttachment: key('session-attachment'),
  sessionFeedback: key('session-feedback'),
  subagentHistory: key('subagent-history'),
  schedules: key('schedules'),
  settings: key('mobile-settings'),
  models: key('mobile-llm-models'),
} as const
