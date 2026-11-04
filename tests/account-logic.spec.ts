import { describe, expect, it } from 'vitest'
import { formatAccountBalance, walletSummary } from '@/components/settings/account-logic'

describe('account balance formatting', () => {
  it('prints two digits with grouping and the wallet currency symbol', () => {
    expect(formatAccountBalance('0', 'CNY')).toBe('¥0.00')
    expect(formatAccountBalance('0.00', 'CNY')).toBe('¥0.00')
    expect(formatAccountBalance('12.5', 'CNY')).toBe('¥12.50')
    expect(formatAccountBalance('1234.56', 'USD')).toBe('$1,234.56')
    expect(formatAccountBalance('1234567.891', 'CNY')).toBe('¥1,234,567.89')
  })

  it('truncates the fraction instead of rounding it up', () => {
    // Rounding 0.999 up would overstate the balance.
    expect(formatAccountBalance('0.999', 'CNY')).toBe('<¥0.01')
    expect(formatAccountBalance('1.999', 'CNY')).toBe('¥1.99')
  })

  it('flags an amount under one cent and a negative under one cent', () => {
    expect(formatAccountBalance('0.004', 'CNY')).toBe('<¥0.01')
    expect(formatAccountBalance('-0.004', 'CNY')).toBe('-¥0.01')
    expect(formatAccountBalance('-3.5', 'CNY')).toBe('-¥3.50')
  })

  it('returns an unparseable amount untouched rather than printing a wrong figure', () => {
    expect(formatAccountBalance('n/a', 'CNY')).toBe('n/a')
    expect(formatAccountBalance('', 'CNY')).toBe('')
  })

  it('joins several wallets and stays silent for none', () => {
    expect(
      walletSummary([
        { balance: '12.5', currency: 'CNY' },
        { balance: '3', currency: 'USD' },
      ]),
    ).toBe('¥12.50 · $3.00')
    expect(walletSummary([])).toBeUndefined()
  })
})
