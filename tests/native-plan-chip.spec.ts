import { createElement } from 'react'
import { act, render, cleanup, fireEvent, type RenderResult } from './support/native-testing'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
}))
vi.mock('@/theme/hooks', async () => {
  const { themes } = await import('@/theme')
  return {
    useAppTheme: () => themes.light,
    useThemedStyles: (factory: (theme: unknown) => unknown) => factory(themes.light),
  }
})
vi.mock('@/components/native-icon', () => ({ NativeIcon: 'Icon' }))
import { NativePlanChip } from '@/components/native-plan-chip'
import { themes } from '@/theme'

const chip = (renderer: RenderResult) =>
  renderer.container.queryAll((node) => node.props.accessibilityLabel === '计划模式已开启，按下关闭')[0]
const resolvedStyle = (node: { props: Record<string, unknown> }): Record<string, unknown> => {
  const style = node.props.style
  const flattened =
    typeof style === 'function' ? (style as (state: { pressed: boolean }) => unknown)({ pressed: false }) : style
  return Object.assign({}, ...(Array.isArray(flattened) ? flattened : [flattened])) as Record<string, unknown>
}

afterEach(cleanup)

describe('native plan chip', () => {
  it('prints nothing while plan mode is off and settled', async () => {
    const off = await render(
      createElement(NativePlanChip, { locked: false, onExit: vi.fn(), plan: { active: false, pending: false } }),
    )
    expect(chip(off)).toBeUndefined()
    await cleanup()
    const absent = await render(createElement(NativePlanChip, { locked: false, onExit: vi.fn(), plan: undefined }))
    expect(chip(absent)).toBeUndefined()
  })

  it('sits as a 28pt chip on r8 when plan mode is on', async () => {
    const renderer = await render(
      createElement(NativePlanChip, { locked: false, onExit: vi.fn(), plan: { active: true, pending: false } }),
    )
    expect(resolvedStyle(chip(renderer))).toMatchObject({
      backgroundColor: themes.light.colors.accentSoft,
      borderRadius: themes.light.radius.sm,
      height: 28,
      paddingHorizontal: 8,
    })
    expect(chip(renderer)!.props.hitSlop).toEqual({ top: 8, bottom: 8 })
  })

  it('submits the exit command and stays quiet while the request settles', async () => {
    let settle: (value: string | null) => void = () => undefined
    const onExit = vi.fn(
      () =>
        new Promise<string | null>((resolve) => {
          settle = resolve
        }),
    )
    const renderer = await render(
      createElement(NativePlanChip, { locked: false, onExit, plan: { active: true, pending: false } }),
    )
    await act(() => fireEvent.press(chip(renderer)!))
    expect(onExit).toHaveBeenCalledTimes(1)
    // The chip disables itself for the duration, so a second tap submits nothing.
    expect(chip(renderer)!.props.disabled).toBe(true)
    await act(() => fireEvent.press(chip(renderer)!))
    expect(onExit).toHaveBeenCalledTimes(1)
    await act(async () => settle(null))
    expect(chip(renderer)!.props.disabled).toBe(false)
  })

  it('reports a failure beside the chip and refuses to fire while locked', async () => {
    const onExit = vi.fn().mockRejectedValue(new Error('unknown command: /plan off'))
    const renderer = await render(
      createElement(NativePlanChip, { locked: false, onExit, plan: { active: true, pending: false } }),
    )
    await act(() => fireEvent.press(chip(renderer)!))
    const texts = renderer.container.queryAll((node) => node.type === 'Text').map((node) => node.props.children)
    expect(texts).toContain('退出计划模式失败')
    await cleanup()
    const locked = vi.fn().mockResolvedValue(null)
    const guarded = await render(
      createElement(NativePlanChip, { locked: true, onExit: locked, plan: { active: true, pending: false } }),
    )
    await act(() => fireEvent.press(chip(guarded)!))
    expect(locked).not.toHaveBeenCalled()
  })
})
