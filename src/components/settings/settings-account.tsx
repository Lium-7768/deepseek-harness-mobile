import { MobileApi, mobileErrorMessage } from '@/api/mobile-api'
import { queryKeys } from '@/api/query-keys'
import { formatAccountBalance, walletSummary } from '@/components/settings/account-logic'
import { ReadOnlySetting, QueryErrorNotice } from '@/components/settings/settings-shared'
import { makeSettingsStyles } from '@/components/settings/settings-styles'
import { t as message } from '@/locale'
import { useConnectionStore } from '@/state/connection'
import { useThemedStyles } from '@/theme/hooks'
import type { MobileAccountBalance, MobileAccountProfile } from '@/types/mobile'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { ScrollView, Text, View } from 'react-native'

/**
 * Renders the desktop's account and balance section.
 *
 * The gateway exposes only the two reads, so this page never offers sign-in,
 * sign-out or bonus acknowledgement: a paired phone can see who is signed in and
 * what the wallets hold, and changes them on the desktop. The section is absent
 * while signed out, matching the desktop, which registers it only once a
 * credential is stored.
 *
 * @returns The account section.
 */
export function AccountSettings({
  connection,
}: {
  connection: NonNullable<ReturnType<typeof useConnectionStore.getState>['connection']>
}): React.JSX.Element {
  const styles = useThemedStyles(makeSettingsStyles)
  const client = useMemo(() => new MobileApi(connection), [connection])
  const profile = useQuery({
    queryKey: queryKeys.accountProfile(connection.gatewayUrl, connection.deviceId),
    queryFn: () => client.accountProfile(),
    retry: false,
    staleTime: 30_000,
  })
  const balance = useQuery({
    queryKey: queryKeys.accountBalance(connection.gatewayUrl, connection.deviceId),
    queryFn: () => client.accountBalance(),
    enabled: profile.data !== null && profile.data !== undefined,
    retry: false,
    staleTime: 30_000,
  })
  return (
    <ScrollView contentContainerStyle={styles.list}>
      <View style={styles.header}>
        <Text style={styles.panelTitle}>{message('settings.sectionAccount')}</Text>
        <Text style={styles.subtitle}>{message('settings.accountReadOnly')}</Text>
      </View>
      {profile.isError ? (
        <QueryErrorNotice
          onRetry={() => void profile.refetch()}
          text={mobileErrorMessage(profile.error, message('settings.loadFailed'))}
        />
      ) : null}
      {profile.data === null ? (
        <View style={styles.section}>
          <Text style={styles.subtitle}>{message('settings.accountSignedOut')}</Text>
        </View>
      ) : profile.data === undefined ? (
        <View style={styles.section}>
          <Text style={styles.subtitle}>{message('common.loading')}</Text>
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <AccountProfileRows profile={profile.data} />
          </View>
          <View style={styles.section}>
            {balance.isError ? (
              <QueryErrorNotice
                onRetry={() => void balance.refetch()}
                text={mobileErrorMessage(balance.error, message('settings.loadFailed'))}
              />
            ) : (
              <AccountBalanceRows balance={balance.data} />
            )}
          </View>
        </>
      )}
    </ScrollView>
  )
}

/**
 * Prints the signed-in identity.
 *
 * @param props - The profile the desktop published.
 * @returns One read-only row per known field, or a placeholder when it is masked.
 */
function AccountProfileRows({ profile }: { profile: MobileAccountProfile }): React.JSX.Element {
  const styles = useThemedStyles(makeSettingsStyles)
  const name = profile.name ?? message('settings.accountNameMissing')
  const contact = profile.contact ?? message('settings.accountContactMissing')
  return (
    <>
      <ReadOnlySetting
        detail={message('settings.accountNameDetail')}
        title={message('settings.accountName')}
        value={name}
      />
      <ReadOnlySetting
        detail={message('settings.accountContactDetail')}
        title={message('settings.accountContact')}
        value={contact}
      />
      {profile.avatarUrl === null ? null : (
        <Text numberOfLines={1} style={styles.subtitle}>
          {message('settings.accountAvatarPresent')}
        </Text>
      )}
    </>
  )
}

/**
 * Prints the wallet balances.
 *
 * @param props - The wallets the desktop published, or undefined while loading.
 * @returns One read-only row per currency, plus the combined reading.
 */
function AccountBalanceRows({ balance }: { balance: MobileAccountBalance | null | undefined }): React.JSX.Element {
  const styles = useThemedStyles(makeSettingsStyles)
  if (balance === null) return <Text style={styles.subtitle}>{message('settings.accountSignedOut')}</Text>
  if (balance === undefined) return <Text style={styles.subtitle}>{message('common.loading')}</Text>
  const summary = walletSummary(balance.wallets)
  const bonus = walletSummary(balance.bonusWallets)
  return (
    <>
      <ReadOnlySetting
        detail={message('settings.accountBalanceDetail')}
        title={message('settings.accountBalance')}
        value={summary ?? message('settings.accountBalanceEmpty')}
      />
      {bonus === undefined ? null : (
        <ReadOnlySetting
          detail={message('settings.accountBonusDetail')}
          title={message('settings.accountBonus')}
          value={bonus}
        />
      )}
      {balance.wallets.map((wallet) => (
        <Text key={wallet.currency} style={styles.subtitle}>
          {`${wallet.currency} ${formatAccountBalance(wallet.balance, wallet.currency)}`}
        </Text>
      ))}
    </>
  )
}
