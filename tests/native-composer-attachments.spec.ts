import { createElement } from 'react'
import { act, render, cleanup, fireEvent, type RenderResult } from './support/native-testing'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ pick: vi.fn(), alert: vi.fn() }))
vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  Pressable: 'Pressable',
  Image: 'Image',
  ActivityIndicator: 'ActivityIndicator',
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
  Alert: { alert: mocks.alert },
  useWindowDimensions: () => ({ width: 393, height: 852, fontScale: 1 }),
  Platform: { OS: 'ios', select: (options: Record<string, unknown>) => options.ios },
}))
vi.mock('expo-image', () => ({ Image: 'Image' }))
vi.mock('@/theme/hooks', async () => {
  const { themes } = await import('@/theme')
  return {
    useAppTheme: () => themes.light,
    useThemedStyles: (factory: (theme: unknown) => unknown) => factory(themes.light),
  }
})
vi.mock('@/components/native-icon', () => ({ NativeIcon: 'Icon' }))
// One row per option, so pressing a row drives the composer's own onSelect.
vi.mock('@/components/native-menu-panel', async () => {
  const { createElement: h } = await import('react')
  type Group = { options: Array<{ label: string; value: string }> }
  return {
    NativeMenuPanel: (props: { open: boolean; groups: Group[]; onSelect: (value: string) => void }) =>
      props.open
        ? h(
            'MenuPanel',
            null,
            props.groups.flatMap((group) =>
              group.options.map((option) =>
                h('Pressable', {
                  accessibilityLabel: option.label,
                  key: option.value,
                  onPress: () => props.onSelect(option.value),
                }),
              ),
            ),
          )
        : null,
  }
})
vi.mock('@/components/native-model-picker', () => ({ NativeModelPicker: 'ModelPicker' }))
vi.mock('@/components/native-goal-editor', () => ({ NativeGoalEditor: 'GoalEditor' }))
vi.mock('expo-image-picker', () => ({ launchImageLibraryAsync: mocks.pick }))
// The encoder is native; the composer only needs a prepared attachment to lay out.
vi.mock('@/components/image-attachments', () => ({
  prepareAttachment: async () => ({
    bytes: 1024,
    data: 'AAAA',
    mediaType: 'image/jpeg',
    name: 'shot.png',
    uri: 'file:///shot.png',
  }),
}))
import { WorkspaceComposer } from '@/components/workspace-composer'
import { themes } from '@/theme'

const noop = () => undefined
const resolvedStyle = (node: { props: Record<string, unknown> }): Record<string, unknown> => {
  const style = node.props.style
  const flattened =
    typeof style === 'function' ? (style as (state: { pressed: boolean }) => unknown)({ pressed: false }) : style
  return Object.assign({}, ...(Array.isArray(flattened) ? flattened : [flattened])) as Record<string, unknown>
}
const byLabel = (renderer: RenderResult, label: string) =>
  renderer.container.queryAll((node) => node.props.accessibilityLabel === label)[0]!
/** Test instances expose `.parent`; walk it so an ancestor can be asserted by identity. */
const parentsOf = (node: { parent: unknown } | null): unknown[] => {
  const trail: unknown[] = []
  for (let current = node?.parent ?? null; current !== null; current = (current as { parent: unknown }).parent) {
    trail.push(current)
  }
  return trail
}

/** Pick one image through the composer's own add menu, so the rail holds a real draft. */
async function composerWithImage(): Promise<RenderResult> {
  mocks.pick.mockResolvedValue({
    assets: [{ base64: 'AAAA', fileName: 'shot.png', mimeType: 'image/png', uri: 'file:///shot.png' }],
    canceled: false,
  })
  const renderer = await render(
    createElement(WorkspaceComposer, {
      onSend: noop,
      placeholder: 'Ask anything',
    } as never),
  )
  await act(() => fireEvent.press(byLabel(renderer, '添加图片或选择操作')))
  await act(() => fireEvent.press(byLabel(renderer, '文件')))
  // The source sheet offers camera or library; drive the library option directly.
  const buttons = mocks.alert.mock.calls[0]![2] as Array<{ text: string; onPress?: () => void }>
  await act(() => buttons.find((button) => button.text === '从照片库选择')!.onPress!())
  return renderer
}

afterEach(async () => {
  await cleanup()
  mocks.pick.mockReset()
  mocks.alert.mockReset()
})

describe('composer attachments', () => {
  it('prints the rail inside the card, so the thumbnails ride the input surface', async () => {
    const renderer = await composerWithImage()
    const rail = byLabel(renderer, '已添加 1 张图片，共 1 KB')
    const card = renderer.container.queryAll((node) => {
      const style = resolvedStyle(node) as { borderRadius?: number; paddingTop?: number }
      return style.paddingTop === 8 && style.borderRadius === themes.light.radius.panel
    })[0]!
    // The rail is part of the card subtree, not a sibling above it.
    expect(parentsOf(rail as never)).toContain(card)
    expect(resolvedStyle(rail)).toMatchObject({ gap: 10, marginBottom: -6, paddingHorizontal: 10, paddingTop: 2 })
  })

  it('draws 64pt thumbnails on the desktop r20 with an inset contrast remove button', async () => {
    const renderer = await composerWithImage()
    const thumbnail = renderer.container.queryAll((node) => node.type === 'Image')[0]!
    expect(resolvedStyle(thumbnail)).toMatchObject({
      borderRadius: themes.light.radius.xl,
      height: 64,
      width: 64,
    })
    const remove = byLabel(renderer, '移除附件图片 1')
    expect(resolvedStyle(remove)).toMatchObject({
      borderRadius: themes.light.radius.pill,
      height: 18,
      right: 4,
      top: 4,
      width: 18,
    })
    // The desktop `.remove` carries no ring of its own.
    expect(resolvedStyle(remove)).not.toHaveProperty('borderWidth')
    expect(remove.props.hitSlop).toBe(12)
  })
})
