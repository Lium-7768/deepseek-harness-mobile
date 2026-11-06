import { describe, expect, it } from 'vitest'
import {
  shouldShowOfflineBar,
  workspaceHeaderMinHeight,
  workspaceKeyboardVerticalOffset,
} from '../src/components/workspace-shell-logic.ts'
import { mobileTheme } from '../src/theme'

describe('workspace shell geometry', () => {
  it('keeps the shell header minimums derived from shared chrome tokens', () => {
    expect(workspaceHeaderMinHeight(false)).toBe(mobileTheme.chrome.headerHeight)
    expect(workspaceHeaderMinHeight(true)).toBe(mobileTheme.chrome.headerHeight + mobileTheme.chrome.headerMetaHeight)
  })

  it('adds the device top inset to the content keyboard offset', () => {
    expect(workspaceKeyboardVerticalOffset(59, false)).toBe(59 + mobileTheme.chrome.headerHeight)
    expect(workspaceKeyboardVerticalOffset(59, true)).toBe(
      59 + mobileTheme.chrome.headerHeight + mobileTheme.chrome.headerMetaHeight,
    )
    expect(workspaceKeyboardVerticalOffset(Number.NaN, false)).toBe(mobileTheme.chrome.headerHeight)
  })
})

describe('offline bar', () => {
  it('shows a reconnect bar on a paired screen whose stream dropped', () => {
    expect(shouldShowOfflineBar({ hasConnection: true, status: 'disconnected' })).toBe(true)
  })

  it('stays off before pairing, where the connect screen owns the state', () => {
    expect(shouldShowOfflineBar({ hasConnection: false, status: 'disconnected' })).toBe(false)
  })

  it('stays off while the stream is healthy or still opening', () => {
    expect(shouldShowOfflineBar({ hasConnection: true, status: 'connected' })).toBe(false)
    expect(shouldShowOfflineBar({ hasConnection: true, status: 'connecting' })).toBe(false)
  })
})
