import type { MobileConnection } from '@/types/mobile'

export function mobileConnectionScope(connection: MobileConnection | undefined): string | undefined {
  return connection === undefined ? undefined : [connection.gatewayUrl, connection.deviceId].join('\u0000')
}
