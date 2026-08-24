import { useCallback, useMemo, useSyncExternalStore } from 'react';

import {
  CURRENCIES,
  areRatesLive,
  formatFiat,
  getCurrency,
  getRate,
  isCurrencyHydrated,
  setCurrency as setStoredCurrency,
  subscribeToCurrency,
  type Currency,
  type CurrencyCode,
} from '../lib/currency';

export type UseCurrency = {
  /** The active display-currency code. */
  currency: CurrencyCode;
  /** The active currency's metadata (symbol, label…). */
  meta: Currency;
  /** The live-or-fallback USD → active-currency rate. */
  rate: number;
  /** Whether a live FX rate is in use (vs the bundled fallback). */
  ratesLive: boolean;
  /** Whether the stored preference has been read yet. */
  isHydrated: boolean;
  /** Select a display currency, persisting the choice. */
  select: (code: CurrencyCode) => void;
  /** Format a USD amount in the active currency at the active rate. */
  format: (usd: number | null) => string;
};

/**
 * Subscribe a component to the active display currency and its FX rate.
 *
 * The external-store snapshot is a composite string — currency + rate + liveness
 * — rather than just the currency name, so a subscriber re-renders both when the
 * user switches currency AND when a background FX refresh lands (which changes
 * the rate but not the currency). Strings compare by value, so an unchanged
 * snapshot stays `Object.is`-equal and never spins `useSyncExternalStore`.
 *
 * No provider required, matching `useTheme` / the web wallet.
 */
export function useCurrency(): UseCurrency {
  const snapshot = useCallback(
    () => `${getCurrency()}:${getRate(getCurrency())}:${areRatesLive() ? 1 : 0}`,
    [],
  );
  useSyncExternalStore(subscribeToCurrency, snapshot, snapshot);
  const isHydrated = useSyncExternalStore(
    subscribeToCurrency,
    isCurrencyHydrated,
    isCurrencyHydrated,
  );

  const currency = getCurrency();
  const rate = getRate(currency);

  const select = useCallback((code: CurrencyCode) => {
    // A failed persist is not worth interrupting the user; the currency has
    // already switched on screen either way.
    void setStoredCurrency(code).catch(() => undefined);
  }, []);

  const format = useCallback(
    // Captures the render's currency + rate, so `format`'s identity changes when
    // either does and callers memoising on it recompute.
    (usd: number | null) => formatFiat(usd, currency, rate),
    [currency, rate],
  );

  return useMemo(
    () => ({
      currency,
      meta: CURRENCIES[currency],
      rate,
      ratesLive: areRatesLive(),
      isHydrated,
      select,
      format,
    }),
    [currency, rate, isHydrated, select, format],
  );
}
