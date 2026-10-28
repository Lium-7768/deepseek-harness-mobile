import { CameraView, useCameraPermissions } from 'expo-camera'
import { router } from 'expo-router'
import { useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { mobileErrorMessage, redeemMobilePairing } from '@/api/mobile-api'
import { NativeActionButton } from '@/components/native-action-button'
import { NativeIcon } from '@/components/native-icon'
import { WorkspaceShell } from '@/components/workspace-shell'
import { useConnectionStore } from '@/state/connection'
import type { AppTheme } from '@/theme'
import { useAppTheme, useThemedStyles } from '@/theme/hooks'
import type { MobilePairingQrPayload } from '@/types/mobile'
import { format, t as message } from '@/locale'

/** Scans a desktop-created one-time pairing QR code and persists only the redeemed device credential. */
export default function ScanPairingScreen(): React.JSX.Element {
  const theme = useAppTheme()
  const styles = useThemedStyles(makeStyles)
  const insets = useSafeAreaInsets()
  const [permission, requestPermission] = useCameraPermissions()
  const [error, setError] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const scanLocked = useRef(false)
  const setConnection = useConnectionStore(state => state.setConnection)

  const scan = async (data: string): Promise<void> => {
    if (scanLocked.current || redeeming) return
    scanLocked.current = true
    setError('')
    setRedeeming(true)
    try {
      const payload = parsePairingPayload(data)
      const connection = await redeemMobilePairing(payload)
      await setConnection(connection)
      router.replace('/workspace')
    } catch (value) {
      setError(mobileErrorMessage(value, message('scan.invalidCode')))
      scanLocked.current = false
    } finally {
      setRedeeming(false)
    }
  }

  return (
    <WorkspaceShell
      title={message('connect.scanAction')}
      showMenu={false}
      leftAction={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={message('scan.back')}
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <NativeIcon name="chevron-left-outline" color={theme.colors.ink} size={22} />
        </Pressable>
      }
    >
      <View style={[styles.screen, { paddingBottom: Math.max(insets.bottom, theme.spacing.lg) }]}>
        <Text style={styles.copy}>{message('scan.hint')}</Text>
        {permission === null ? (
          <View style={styles.center}><ActivityIndicator color={theme.colors.accent} /></View>
        ) : !permission.granted ? (
          <View style={styles.permissionCard}>
            <NativeIcon name="warning-triangle-outline" color={theme.colors.warning} size={22} />
            <Text style={styles.permissionTitle}>{message('scan.cameraPermissionTitle')}</Text>
            <Text style={styles.permissionCopy}>{message('scan.cameraPermissionBody')}</Text>
            <NativeActionButton label={message('scan.allowCamera')} icon="link-outline" onPress={() => void requestPermission()} style={styles.fullWidth} />
          </View>
        ) : (
          <View style={styles.cameraCard}>
            <CameraView
              accessibilityLabel={message('scan.frame')}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              facing="back"
              onBarcodeScanned={({ data }) => void scan(data)}
              style={styles.camera}
            />
            <View pointerEvents="none" style={styles.frame} />
            <View pointerEvents="none" style={styles.scanHint}>
              <Text style={styles.scanHintText}>{message('scan.frameHint')}</Text>
            </View>
            {redeeming ? (
              <View style={styles.busy}>
                <ActivityIndicator color={theme.colors.onBrand} />
                <Text style={styles.busyText}>{message('scan.redeeming')}</Text>
              </View>
            ) : null}
          </View>
        )}
        {error !== '' ? (
          <View accessibilityRole="alert" style={styles.error}>
            <NativeIcon name="warning-outline" color={theme.colors.danger} size={18} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        <NativeActionButton label={message('scan.manualInstead')} icon="link-outline" variant="secondary" onPress={() => router.back()} style={styles.fullWidth} />
      </View>
    </WorkspaceShell>
  )
}

function parsePairingPayload(data: string): MobilePairingQrPayload {
  let value: unknown
  try {
    value = JSON.parse(data)
  } catch {
    throw new Error(message('scan.invalidCode'))
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    throw new Error(message('scan.invalidCode'))
  const payload = value as Record<string, unknown>
  if (
    payload.version !== 1 ||
    typeof payload.gatewayUrl !== 'string' ||
    typeof payload.pairingId !== 'string' ||
    typeof payload.pairingSecret !== 'string' ||
    typeof payload.expiresAt !== 'string' ||
    payload.gatewayUrl === '' ||
    payload.pairingId === '' ||
    payload.pairingSecret === ''
  )
    throw new Error(message('scan.invalidCode'))
  const url = new URL(payload.gatewayUrl)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error(message('scan.invalidGateway'))
  return {
    version: 1,
    gatewayUrl: url.toString().replace(/\/$/, ''),
    pairingId: payload.pairingId,
    pairingSecret: payload.pairingSecret,
    expiresAt: payload.expiresAt,
  }
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    screen: { flex: 1, gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg },
    back: { alignItems: 'center', justifyContent: 'center', minHeight: theme.touch.minTarget, minWidth: theme.touch.minTarget },
    copy: { color: theme.colors.inkMuted, fontSize: theme.typography.body, lineHeight: 21 },
    center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
    cameraCard: { aspectRatio: 1, borderColor: theme.colors.borderStrong, borderRadius: theme.radius.card, borderWidth: 1, overflow: 'hidden', position: 'relative' },
    camera: { flex: 1 },
    frame: {
      borderColor: theme.colors.accent,
      borderRadius: theme.radius.control,
      borderWidth: 2,
      height: '58%',
      left: '21%',
      position: 'absolute',
      top: '21%',
      width: '58%',
    },
    scanHint: {
      alignItems: 'center',
      backgroundColor: theme.colors.scrimCamera,
      borderRadius: theme.radius.pill,
      bottom: theme.spacing.lg,
      left: theme.spacing.lg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      position: 'absolute',
      right: theme.spacing.lg,
    },
    scanHintText: { color: theme.colors.onScrim, fontSize: theme.typography.caption, fontWeight: '700' },
    busy: { alignItems: 'center', backgroundColor: theme.colors.overlayBusy, bottom: 0, flexDirection: 'row', gap: theme.spacing.sm, justifyContent: 'center', left: 0, position: 'absolute', right: 0, top: 0 },
    busyText: { color: theme.colors.onScrim, fontSize: theme.typography.body, fontWeight: '700' },
    permissionCard: { alignItems: 'center', backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border, borderRadius: theme.radius.card, borderWidth: 1, gap: theme.spacing.sm, padding: theme.spacing.xl },
    permissionTitle: { color: theme.colors.ink, fontSize: theme.typography.bodyLarge, fontWeight: '800' },
    permissionCopy: { color: theme.colors.inkMuted, fontSize: theme.typography.body, lineHeight: 20, textAlign: 'center' },
    fullWidth: { width: '100%' },
    error: { alignItems: 'flex-start', backgroundColor: theme.colors.dangerSoft, borderColor: theme.colors.danger, borderRadius: theme.radius.card, borderWidth: 1, flexDirection: 'row', gap: theme.spacing.sm, padding: theme.spacing.md },
    errorText: { color: theme.colors.danger, flex: 1, lineHeight: 19 },
    pressed: { opacity: 0.68 },
  })
