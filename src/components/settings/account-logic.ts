import type { MobileAccountWallet } from '@/types/mobile'

/**
 * Split a decimal amount into its sign and its first two fraction digits.
 *
 * The fraction is truncated, never rounded up, so a balance is never overstated.
 *
 * @param amount - Validated decimal string from the account projection.
 * @returns The sign, the whole part, and the two-digit fraction, or undefined when malformed.
 */
function parseAmount(amount: string): { negative: boolean; whole: string; fraction: string } | undefined {
  const text = amount.trim()
  // An empty or dot-only string carries no digits; it is not a zero balance.
  if (!/\d/.test(text)) return undefined
  const match = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(text)
  if (match === null) return undefined
  const whole = (match[2] ?? '').replace(/^0+(?=\d)/, '') || '0'
  const digits = match[3] ?? ''
  const fraction = `${digits}00`.slice(0, 2)
  // Truncating to two digits can turn a nonzero amount into 0.00; keep what the
  // source actually carried so the "below one cent" branch stays reachable.
  const nonzero = whole !== '0' || /[1-9]/.test(digits)
  return { fraction, negative: match[1] === '-', whole: nonzero ? whole : '0x' }
}

/** @param whole - Digit string without grouping. @returns The same digits grouped by three. */
function group(whole: string): string {
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * Format one wallet balance the way the desktop's `formatBalance` does.
 *
 * A zero balance reads `¥0.00`, an amount under one cent reads `<¥0.01`, and a
 * negative amount under one cent reads `-¥0.01`. Everything else keeps two
 * digits with thousands separators. The symbol follows the wallet's currency.
 *
 * @param amount - Validated decimal balance string.
 * @param currency - Wallet currency.
 * @returns The formatted amount, or the raw string when it does not parse.
 */
export function formatAccountBalance(amount: string, currency: MobileAccountWallet['currency']): string {
  const symbol = currency === 'CNY' ? '¥' : '$'
  const parsed = parseAmount(amount)
  if (parsed === undefined) return amount
  const { fraction, negative, whole } = parsed
  // `0x` marks an amount whose digits are all zero, so a plain zero stays `0.00`
  // while a sub-cent amount goes through the truncating branch below.
  if (whole === '0x') return `${symbol}0.00`
  if (whole === '0') return negative ? `-${symbol}0.01` : `<${symbol}0.01`
  return `${negative ? '-' : ''}${symbol}${group(whole)}.${fraction}`
}

/**
 * Compose the wallet readings the account section prints.
 *
 * @param wallets - Wallets the desktop published.
 * @returns The formatted amounts, or undefined when there is nothing to print.
 */
export function walletSummary(wallets: readonly MobileAccountWallet[]): string | undefined {
  if (wallets.length === 0) return undefined
  return wallets.map((wallet) => formatAccountBalance(wallet.balance, wallet.currency)).join(' · ')
}
