import { Horizon } from '@stellar/stellar-sdk';

import { getNetwork } from './network';
import type { TxRecord } from './activityFeed';

/** Trim a Horizon amount ("2500.0000000") to a clean grouped number. */
function fmt(raw: string | undefined): string {
  const n = Number(raw ?? '0');
  if (!isFinite(n)) return '0';
  return n.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

function assetOf(type: string | undefined, code: string | undefined): string {
  return type === 'native' || !type ? 'XLM' : code ?? 'XLM';
}

/**
 * Load an account's recent activity straight from Horizon — the reliable source
 * on any network (Wraith, the Soroban indexer, doesn't cover testnet accounts).
 * Maps payments, account creations, and path-payments to the shared TxRecord.
 */
export async function loadHorizonActivity(address: string, limit = 25): Promise<TxRecord[]> {
  const server = new Horizon.Server(getNetwork().horizonUrl);
  let records: Array<Record<string, unknown>>;
  try {
    const page = await server.payments().forAccount(address).order('desc').limit(limit).call();
    records = page.records as unknown as Array<Record<string, unknown>>;
  } catch {
    return [];
  }

  const out: TxRecord[] = [];
  for (const r of records) {
    const type = String(r['type'] ?? '');
    const id = String(r['id'] ?? '');
    const hash = r['transaction_hash'] ? String(r['transaction_hash']) : undefined;
    const createdAt = String(r['created_at'] ?? '');
    const timestamp = createdAt ? Math.floor(new Date(createdAt).getTime() / 1000) : 0;

    if (type === 'payment') {
      const sent = r['from'] === address;
      out.push({
        id,
        type: sent ? 'sent' : 'received',
        amount: fmt(r['amount'] as string),
        asset: assetOf(r['asset_type'] as string, r['asset_code'] as string),
        counterparty: String((sent ? r['to'] : r['from']) ?? 'unknown'),
        timestamp,
        hash,
      });
    } else if (type === 'create_account') {
      const sent = r['funder'] === address;
      out.push({
        id,
        type: sent ? 'sent' : 'received',
        amount: fmt(r['starting_balance'] as string),
        asset: 'XLM',
        counterparty: String((sent ? r['account'] : r['funder']) ?? 'unknown'),
        timestamp,
        hash,
      });
    } else if (type.startsWith('path_payment')) {
      const sent = r['from'] === address;
      out.push({
        id,
        type: 'swapped',
        amount: fmt((r['source_amount'] as string) ?? (r['amount'] as string)),
        asset: assetOf(r['source_asset_type'] as string, r['source_asset_code'] as string),
        counterparty: String((sent ? r['to'] : r['from']) ?? 'unknown'),
        timestamp,
        hash,
        destAmount: fmt(r['amount'] as string),
        destAsset: assetOf(r['asset_type'] as string, r['asset_code'] as string),
      });
    }
  }
  return out;
}
