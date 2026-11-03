import { beforeEach, expect, it } from 'vitest'
import { useComposerDraftStore } from '@/state/composer-drafts'

beforeEach(() => useComposerDraftStore.getState().clear())

it('keeps session drafts separate and preserves edits made while a send settles', () => {
  const store = useComposerDraftStore.getState()
  store.setDraft('session-a', 'first')
  store.setDraft('session-b', 'second')
  store.setDraft('session-a', 'revised')
  store.clearSentDraft('session-a', 'first')
  expect(useComposerDraftStore.getState().drafts).toEqual({ 'session-b': 'second', 'session-a': 'revised' })
  store.clearSentDraft('session-a', 'revised')
  expect(useComposerDraftStore.getState().drafts).toEqual({ 'session-b': 'second' })
})

it('bounds abandoned route drafts and clears them when the paired desktop changes', () => {
  const store = useComposerDraftStore.getState()
  for (let i = 0; i < 40; i++) store.setDraft(`${i}`, 'draft')
  expect(Object.keys(useComposerDraftStore.getState().drafts)).toHaveLength(30)
  store.clear()
  expect(useComposerDraftStore.getState().drafts).toEqual({})
})
