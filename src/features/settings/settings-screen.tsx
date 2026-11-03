import { NativeIcon } from '@/components/native-icon'
import { firstParam } from '@/components/route-params'
import { WorkspaceShell } from '@/components/workspace-shell'
import { t as message } from '@/locale'
import { useConnectionStore } from '@/state/connection'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import { useRef, useEffect } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { Pressable, ScrollView, Text, View } from 'react-native'

import {
  SETTINGS_TABS,
  parseSection,
  sectionTitle,
  settingsSectionIcon,
  type MobileSettingsSection as SettingsSection,
} from '@/components/settings-logic'
import { ConnectionSettings } from '@/components/settings/settings-connection'
import { GeneralSettings } from '@/components/settings/settings-general'
import { ModelSettings } from '@/components/settings/settings-models'
import { PluginSettings } from '@/components/settings/settings-plugins'
import { PresetSettings } from '@/components/settings/settings-presets'
import { makeSettingsStyles } from '@/components/settings/settings-styles'

export default function SettingsScreen(): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeSettingsStyles)
  const { section: rawSection, preset: rawPreset } = useLocalSearchParams<{
    section?: string | string[]
    preset?: string | string[]
  }>()
  const section = parseSection(firstParam(rawSection))
  const preset = firstParam(rawPreset)
  const connection = useConnectionStore((state) => state.connection)
  // Sections share this route's pathname, so the back control restores the level
  // the reader came from instead of popping the whole Settings route.
  const backTarget = { pathname: '/settings', params: { section: 'presets' } } as const
  const leftAction =
    preset === undefined || section !== 'presets' ? undefined : (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={message('settings.backToSettings')}
        hitSlop={8}
        onPress={() => router.replace(backTarget)}
        style={styles.back}
      >
        <NativeIcon name="chevron-left-outline" color={theme.colors.ink} size={20} />
      </Pressable>
    )
  // One sheet with a section bar, matching the desktop Settings overlay at phone
  // width: the bar is the whole navigation, so a section is a tab rather than a
  // pushed page.
  return (
    <WorkspaceShell
      leftAction={leftAction}
      rightAction={<SettingsClose />}
      showMenu={false}
      title={message('settings.title')}
      titleLeading={null}
      showBrand={false}
    >
      {connection === undefined ? (
        <ConnectionSettings connection={connection} />
      ) : (
        <>
          <SettingsTabs active={section ?? 'general'} preset={preset} />
          {section === 'connection' ? (
            <ConnectionSettings connection={connection} />
          ) : section === 'models' ? (
            <ModelSettings connection={connection} />
          ) : section === 'plugins' ? (
            <PluginSettings connection={connection} />
          ) : section === 'presets' ? (
            <PresetSettings connection={connection} selectedPreset={preset} />
          ) : (
            <GeneralSettings connection={connection} />
          )}
        </>
      )}
    </WorkspaceShell>
  )
}

/** Closes the Settings sheet, returning to the screen that opened it. */
function SettingsClose(): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeSettingsStyles)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={message('settings.close')}
      hitSlop={10}
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/workspace'))}
      style={({ pressed }) => [styles.close, pressed && styles.pressed]}
    >
      <NativeIcon name="close-outline" color={theme.colors.ink} size={22} />
    </Pressable>
  )
}

/** Sections shown in the sheet's bar, in the desktop's order. */
function SettingsTabs({ active, preset }: { active: SettingsSection; preset: string | undefined }): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeSettingsStyles)
  const scroll = useRef<ScrollView>(null)
  const offsets = useRef(new Map<string, number>())
  useEffect(() => {
    const x = offsets.current.get(active)
    if (x !== undefined) scroll.current?.scrollTo({ x: Math.max(0, x - 12), animated: true })
  }, [active])
  return (
    <View style={styles.tabs}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={styles.tabsContent}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {SETTINGS_TABS.map((item) => {
          const selected = item === active
          return (
            <Pressable
              key={item}
              accessibilityRole="tab"
              onLayout={(event) => {
                offsets.current.set(item, event.nativeEvent.layout.x)
                if (selected)
                  scroll.current?.scrollTo({ x: Math.max(0, event.nativeEvent.layout.x - 12), animated: false })
              }}
              accessibilityLabel={sectionTitle(item)}
              accessibilityState={{ selected }}
              onPress={() =>
                router.replace({
                  pathname: '/settings',
                  params: preset === undefined || item !== 'presets' ? { section: item } : { section: item, preset },
                })
              }
              style={({ pressed }) => [styles.tab, selected && styles.tabSelected, pressed && styles.pressed]}
            >
              <NativeIcon name={settingsSectionIcon(item)} color={theme.colors.ink} size={16} />
              <Text style={styles.tabLabel} numberOfLines={1}>
                {sectionTitle(item)}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}
