import { useConnectionStore } from '@/state/connection'
import { useAppTheme } from '@/theme/hooks'
import { Redirect } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
export default function IndexScreen(): React.JSX.Element {
  const theme = useAppTheme()
  const connection = useConnectionStore((state) => state.connection)
  const initialized = useConnectionStore((state) => state.initialized)
  const initialize = useConnectionStore((state) => state.initialize)
  useEffect(() => {
    void initialize()
  }, [initialize])
  if (!initialized)
    return (
      <View
        style={{
          alignItems: 'center',
          backgroundColor: theme.colors.background,
          flex: 1,
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={theme.colors.inkFaint} />
      </View>
    )
  return <Redirect href={connection ? '/workspace' : '/connect'} />
}
