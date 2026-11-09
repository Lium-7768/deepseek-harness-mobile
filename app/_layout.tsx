import { useComposerDraftStore } from '@/state/composer-drafts'
import * as SplashScreen from 'expo-splash-screen'
import 'react-native-gesture-handler'

// Hold the native launch screen until the in-app cover is drawn, so the brand mark
// never disappears between the two: the sequence is one screen handing over to the
// next rather than a splash, a blank window, and then a mark.
void SplashScreen.preventAutoHideAsync()

import { createMobileQueryClient } from '@/api/query-client'
import { AppErrorBoundary } from '@/components/app-error-boundary'
import { BootSplash } from '@/components/boot-splash'
import { MobileSyncBridge } from '@/components/mobile-sync-bridge'
import { NativeSnackbar } from '@/components/native-snackbar'
import { SessionDrawer } from '@/components/session-drawer'
import { drawerWidthForViewport } from '@/components/session-drawer-logic'
import { StartupGate } from '@/components/startup-gate'
import { useNativeQueryFocus } from '@/hooks/use-native-query-focus'
import { useConnectionStore } from '@/state/connection'
import { mobileConnectionScope } from '@/state/connection-scope'
import { useAppTheme } from '@/theme/hooks'
import { QueryClientProvider } from '@tanstack/react-query'
import { NavigationBar } from 'expo-navigation-bar'
import { Drawer } from 'expo-router/drawer'
import { useEffect, useState } from 'react'
import { StatusBar, useWindowDimensions, View } from 'react-native'

export default function RootLayout(): React.JSX.Element {
  const connection = useConnectionStore((state) => state.connection)
  const connectionScope = mobileConnectionScope(connection)
  const initializationError = useConnectionStore((state) => state.initializationError)
  const initialized = useConnectionStore((state) => state.initialized)
  const initialize = useConnectionStore((state) => state.initialize)
  const { width } = useWindowDimensions()
  const theme = useAppTheme()
  useEffect(() => {
    void initialize()
  }, [initialize])
  if (!initialized || initializationError)
    return (
      <>
        <StartupGate />
        {/* The store read failed or is still running: the cover steps aside so the
            gate's message is what the reader sees. */}
        <BootSplash ready={initializationError !== undefined && initializationError !== null ? true : false} />
      </>
    )
  return (
    <View style={{ flex: 1 }}>
      <AppErrorBoundary>
        <ConnectionQueries key={connectionScope ?? 'unpaired'}>
          <StatusBar barStyle={theme.appearance === 'dark' ? 'light-content' : 'dark-content'} />
          <NavigationBar style={theme.appearance === 'dark' ? 'light' : 'dark'} />
          <MobileSyncBridge />
          <Drawer
            drawerContent={(props) => <SessionDrawer {...props} />}
            screenOptions={{
              headerShown: false,
              drawerPosition: 'left',
              drawerType: 'front',
              drawerStyle: { backgroundColor: theme.colors.drawerBackground, width: drawerWidthForViewport(width) },
              overlayColor: theme.colors.scrim,
              drawerItemStyle: { display: 'none' },
            }}
          >
            <Drawer.Screen name="index" options={{ swipeEnabled: false }} />
            <Drawer.Screen name="workspace" />
            <Drawer.Screen name="connect" options={{ swipeEnabled: false }} />
            <Drawer.Screen name="connect/scan" options={{ swipeEnabled: false }} />
            <Drawer.Screen name="session/[sessionId]" />
            <Drawer.Screen name="session/[sessionId]/interactions" />
            <Drawer.Screen name="session/[sessionId]/rename" options={{ swipeEnabled: false }} />
            <Drawer.Screen name="session/[sessionId]/subagent" options={{ swipeEnabled: false }} />
            <Drawer.Screen name="workspace/[workspaceId]/rename" options={{ swipeEnabled: false }} />
            <Drawer.Screen name="settings" />
            <Drawer.Screen name="schedules" />
          </Drawer>
          <NativeSnackbar />
        </ConnectionQueries>
      </AppErrorBoundary>
      <BootSplash ready={initialized} />
    </View>
  )
}

/** A desktop switch gets a fresh cache: late callbacks can only reach the disposed client. */
function ConnectionQueries({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [queryClient] = useState(createMobileQueryClient)
  useNativeQueryFocus()
  useEffect(
    () => () => {
      queryClient.clear()
      useComposerDraftStore.getState().clear()
    },
    [queryClient],
  )
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
