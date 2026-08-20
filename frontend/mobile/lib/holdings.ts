import { Horizon } from '@stellar/stellar-sdk';

import { getNetwork } from './network';
import { fetchPrice, usdValue } from './fetchPrice';

export type Holding = {
  code: string;
  name: string;
  issuer: string | null;
  balance: string;
  /** USD value of the whole balance, or null when unpriced. */
  usd: number | null;
  /** Whether this is the native (XLM) balance. */
  native: boolean;
};

/** Display name for well-known assets; falls back to the code. */
const ASSET_NAMES: Record<string, string> = {
  XLM: 'Lumens',
  USDC: 'USD Coin',
};

function isAccountNotFound(err: unknown): boolean {
  const e = err as { name?: string; response?: { status?: number } };
  return e?.name === 'NotFoundError' || e?.response?.status === 404;
}

/**
 * Load an account's holdings (native XLM + classic trustlines), each priced
 * best-effort. Native first. Shared by the assets list and the send-flow asset
 * selector so both show the same balances.
 */
export async function loadHoldings(address: string): Promise<Holding[]> {
  const server = new Horizon.Server(getNetwork().horizonUrl);
  let balances: Array<{ asset_type: string; asset_code?: string; asset_issuer?: string; balance: string }>;
  try {
    const account = await server.loadAccount(address);
    balances = account.balances as typeof balances;
  } catch (err) {
    if (isAccountNotFound(err)) return [];
    throw err;
  }

  const rows: Array<{ code: string; issuer: string | null; balance: string; native: boolean }> = [];
  for (const b of balances) {
    if (b.asset_type === 'native') rows.unshift({ code: 'XLM', issuer: null, balance: b.balance, native: true });
    else if ((b.asset_type === 'credit_alphanum4' || b.asset_type === 'credit_alphanum12') && b.asset_code) {
      rows.push({ code: b.asset_code, issuer: b.asset_issuer ?? null, balance: b.balance, native: false });
    }
  }

  return Promise.all(
    rows.map(async (r): Promise<Holding> => {
      const price = await fetchPrice(r.code, r.issuer);
      return {
        code: r.code,
        name: ASSET_NAMES[r.code] ?? r.code,
        issuer: r.issuer,
        balance: r.balance,
        usd: usdValue(r.balance, price),
        native: r.native,
      };
    }),
  );
}

/** Per-unit USD price of a holding, or null when unpriced. */
export function unitPrice(h: Holding): number | null {
  const bal = Number(h.balance);
  if (h.usd === null || !isFinite(bal) || bal <= 0) return null;
  return h.usd / bal;
}
