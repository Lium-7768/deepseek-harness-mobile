import { createContext, useContext, useState } from 'react'

export type ConversationDisclosures = {
  expanded: ReadonlySet<string>
  toggle(key: string): void
}

export const ConversationDisclosureContext = createContext<ConversationDisclosures | undefined>(undefined)

/** The screen owns disclosures so native list recycling cannot silently close a tool or reasoning row. */
export function useConversationDisclosure(key: string): [boolean, () => void] {
  const context = useContext(ConversationDisclosureContext)
  const [local, setLocal] = useState(false)
  return context ? [context.expanded.has(key), () => context.toggle(key)] : [local, () => setLocal((value) => !value)]
}
