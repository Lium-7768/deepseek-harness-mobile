import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react'

type Listener = () => void

export type ConversationDisclosures = {
  /** Legacy expanded set for contexts that only track false-default keys. */
  expanded?: ReadonlySet<string>
  /** Explicit per-key open/closed overrides (takes precedence over defaultOpen). */
  overrides?: ReadonlyMap<string, boolean>
  /** Reads the current explicit override for one key, if any. */
  getOverride?(key: string): boolean | undefined
  /** Subscribes to override changes affecting a single disclosure key. */
  subscribe?(key: string, listener: Listener): () => void
  /** Toggles a key; pass currentOpen when defaultOpen may be true. */
  toggle(key: string, currentOpen?: boolean): void
  /** Collapses a batch of descendant disclosure keys when an enclosing Turn folds. */
  collapseMany?(keys: readonly string[]): void
}

type DisclosureStore = ConversationDisclosures & {
  reset(): void
}

function createDisclosureStore(): DisclosureStore {
  const overrides = new Map<string, boolean>()
  const listenersByKey = new Map<string, Set<Listener>>()

  const notifyKey = (key: string): void => {
    const listeners = listenersByKey.get(key)
    if (!listeners) return
    for (const listener of [...listeners]) listener()
  }

  const getOverride = (key: string): boolean | undefined => overrides.get(key)

  const subscribe = (key: string, listener: Listener): (() => void) => {
    let listeners = listenersByKey.get(key)
    if (!listeners) {
      listeners = new Set()
      listenersByKey.set(key, listeners)
    }
    listeners.add(listener)
    return () => {
      const current = listenersByKey.get(key)
      if (!current) return
      current.delete(listener)
      if (current.size === 0) listenersByKey.delete(key)
    }
  }

  const toggle = (key: string, currentOpen?: boolean): void => {
    const wasOpen = currentOpen ?? overrides.get(key) ?? false
    overrides.set(key, !wasOpen)
    notifyKey(key)
  }

  const collapseMany = (keys: readonly string[]): void => {
    if (keys.length === 0) return
    const changed: string[] = []
    for (const key of keys) {
      if (overrides.get(key) === true) {
        overrides.delete(key)
        changed.push(key)
      }
    }
    for (const key of changed) notifyKey(key)
  }

  const reset = (): void => {
    if (overrides.size === 0) return
    const changed = [...overrides.keys()]
    overrides.clear()
    for (const key of changed) notifyKey(key)
  }

  return { collapseMany, getOverride, reset, subscribe, toggle }
}

const noopSubscribe = (): (() => void) => () => undefined

export const ConversationDisclosureContext = createContext<ConversationDisclosures | undefined>(undefined)

/** Screen-owned disclosure store so native list recycling preserves open/closed overrides across scrolls. */
export function useConversationDisclosuresState(resetKey?: string): ConversationDisclosures {
  const [store] = useState(createDisclosureStore)
  const previousResetKey = useRef(resetKey)
  useEffect(() => {
    if (previousResetKey.current === resetKey) return
    previousResetKey.current = resetKey
    store.reset()
  }, [resetKey, store])
  return store
}

/** The screen owns disclosures so native list recycling cannot silently close a tool, context, or reasoning row. */
export function useConversationDisclosure(key: string, defaultOpen = false): [boolean, () => void] {
  const context = useContext(ConversationDisclosureContext)
  const [local, setLocal] = useState<boolean | undefined>(undefined)
  const subscribe = useCallback(
    (listener: Listener) => {
      if (context?.subscribe) return context.subscribe(key, listener)
      return noopSubscribe()
    },
    [context, key],
  )
  const getSnapshot = useCallback((): boolean | undefined => {
    if (context?.getOverride) return context.getOverride(key)
    return undefined
  }, [context, key])
  const subscribedOverride = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const open = context
    ? context.getOverride !== undefined
      ? (subscribedOverride ?? defaultOpen)
      : context.overrides !== undefined
        ? (context.overrides.get(key) ?? defaultOpen)
        : context.expanded?.has(key) === true
          ? !defaultOpen
          : defaultOpen
    : (local ?? defaultOpen)

  const toggle = useCallback(() => {
    if (context) {
      context.toggle(key, open)
    } else {
      setLocal((current) => !(current ?? defaultOpen))
    }
  }, [context, defaultOpen, key, open])

  return [open, toggle]
}
