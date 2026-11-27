import { createElement, memo } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, render } from './support/native-testing'
import {
  ConversationDisclosureContext,
  useConversationDisclosure,
  useConversationDisclosuresState,
  type ConversationDisclosures,
} from '@/components/conversation-disclosure'

afterEach(cleanup)

describe('ConversationDisclosure store', () => {
  it('re-renders only subscribers of the toggled key', async () => {
    const renders = { a: 0, b: 0 }
    const actions: Record<string, () => void> = {}
    const states: Record<string, boolean> = {}

    const Row = memo(function Row({ id }: { id: 'a' | 'b' }) {
      renders[id] += 1
      const [open, toggle] = useConversationDisclosure(`row:${id}`)
      actions[id] = toggle
      states[id] = open
      return createElement('Row', { id, open })
    })

    function Harness() {
      const disclosures = useConversationDisclosuresState('s1')
      return createElement(
        ConversationDisclosureContext.Provider,
        { value: disclosures },
        createElement(Row, { id: 'a' }),
        createElement(Row, { id: 'b' }),
      )
    }

    await render(createElement(Harness))
    expect(renders).toEqual({ a: 1, b: 1 })
    expect(states).toEqual({ a: false, b: false })

    await act(async () => {
      actions.a?.()
    })
    expect(states).toEqual({ a: true, b: false })
    expect(renders).toEqual({ a: 2, b: 1 })

    await act(async () => {
      actions.a?.()
    })
    expect(states).toEqual({ a: false, b: false })
    expect(renders).toEqual({ a: 3, b: 1 })
  })

  it('collapses only requested open keys and resets overrides on resetKey change', async () => {
    const renders = { a: 0, b: 0, c: 0 }
    const actions: Record<string, () => void> = {}
    const states: Record<string, boolean> = {}
    let storeRef: ConversationDisclosures | undefined

    const Row = memo(function Row({ id }: { id: 'a' | 'b' | 'c' }) {
      renders[id] += 1
      const [open, toggle] = useConversationDisclosure(`row:${id}`)
      actions[id] = toggle
      states[id] = open
      return createElement('Row', { id, open })
    })

    function Harness({ sessionKey }: { sessionKey: string }) {
      const disclosures = useConversationDisclosuresState(sessionKey)
      storeRef = disclosures
      return createElement(
        ConversationDisclosureContext.Provider,
        { value: disclosures },
        createElement(Row, { id: 'a' }),
        createElement(Row, { id: 'b' }),
        createElement(Row, { id: 'c' }),
      )
    }

    const view = await render(createElement(Harness, { sessionKey: 's1' }))
    await act(async () => {
      actions.a?.()
      actions.b?.()
    })
    expect(states).toEqual({ a: true, b: true, c: false })
    const cRendersBefore = renders.c

    await act(async () => {
      storeRef?.collapseMany?.(['row:a', 'row:c'])
    })
    expect(states).toEqual({ a: false, b: true, c: false })
    expect(renders.c).toBe(cRendersBefore)

    await view.rerender(createElement(Harness, { sessionKey: 's2' }))
    expect(states).toEqual({ a: false, b: false, c: false })
  })

  it('works standalone without a provider', async () => {
    let currentOpen = false
    let toggleFn: (() => void) | undefined
    function Solo() {
      const [open, toggle] = useConversationDisclosure('solo', true)
      currentOpen = open
      toggleFn = toggle
      return createElement('Solo', { open })
    }
    await render(createElement(Solo))
    expect(currentOpen).toBe(true)
    await act(async () => {
      toggleFn?.()
    })
    expect(currentOpen).toBe(false)
  })
})
