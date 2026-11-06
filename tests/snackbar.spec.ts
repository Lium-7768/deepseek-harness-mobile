import { beforeEach, describe, expect, it, vi } from 'vitest'
import { showSnackbar, useSnackbarStore } from '@/state/snackbar'

const reset = (): void => {
  useSnackbarStore.setState({ current: undefined, queued: [] })
}

beforeEach(reset)

describe('snackbar queue', () => {
  it('shows the first message immediately and queues the rest', () => {
    showSnackbar('one')
    showSnackbar('two')
    expect(useSnackbarStore.getState().current?.text).toBe('one')
    expect(useSnackbarStore.getState().queued.map((entry) => entry.text)).toEqual(['two'])
  })

  it('promotes the next message when the visible one is dismissed', () => {
    showSnackbar('one')
    showSnackbar('two')
    const first = useSnackbarStore.getState().current!
    useSnackbarStore.getState().dismiss(first.id)
    expect(useSnackbarStore.getState().current?.text).toBe('two')
    expect(useSnackbarStore.getState().queued).toHaveLength(0)
  })

  it('ignores a dismissal for a message that is no longer visible', () => {
    showSnackbar('one')
    const stale = useSnackbarStore.getState().current!
    useSnackbarStore.getState().dismiss(stale.id)
    showSnackbar('two')
    useSnackbarStore.getState().dismiss(stale.id)
    expect(useSnackbarStore.getState().current?.text).toBe('two')
  })

  it('runs an undo once even when pressed twice', () => {
    const undo = vi.fn()
    showSnackbar('archived', undo)
    const entry = useSnackbarStore.getState().current!
    entry.undo?.()
    entry.undo?.()
    expect(undo).toHaveBeenCalledTimes(1)
  })

  it('omits the undo affordance when the action cannot be reversed', () => {
    showSnackbar('deleted')
    expect(useSnackbarStore.getState().current?.undo).toBeUndefined()
  })
})

describe('snackbar queue limit', () => {
  it('keeps only the newest waits so a stale confirmation cannot surface late', () => {
    showSnackbar('one')
    showSnackbar('two')
    showSnackbar('three')
    showSnackbar('four')
    expect(useSnackbarStore.getState().current?.text).toBe('one')
    expect(useSnackbarStore.getState().queued.map((entry) => entry.text)).toEqual(['three', 'four'])
  })
})
