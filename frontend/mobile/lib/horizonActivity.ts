import { Address, Asset, Horizon, StrKey, scValToNative, xdr, rpc as SorobanRpc } from '@stellar/stellar-sdk';

import { getNetwork } from './network';
import { getFeePayerAddress } from './activity';
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
/**
 * A smart wallet's own transfers are SAC `transfer` EVENTS (invoke ops), which
 * Horizon's payments feed never surfaces. Read them from Soroban RPC's event
 * store instead (bounded by RPC retention, ~7 days on testnet — enough for a
 * live activity feed; full history is the indexer's job).
 */
async function loadContractSacActivity(addresses: string[], limit: number): Promise<TxRecord[]> {
  try {
    const mine = new Set(addresses);
    const net = getNetwork();
    const server = new SorobanRpc.Server(net.rpcUrl);
    const sac = Asset.native().contractId(net.networkPassphrase);
    const latest = await server.getLatestLedger();

    const transferSym = xdr.ScVal.scvSymbol('transfer').toXDR('base64');
    // OR of: transfers FROM any of ours, transfers TO any of ours. Covers the
    // wallet contract AND the fee-payer's Soroban sends (e.g. G→C transfers),
    // both invisible to Horizon's payments feed.
    const topics = addresses.flatMap((a) => {
      const scv = xdr.ScVal.scvAddress(new Address(a).toScAddress()).toXDR('base64');
      return [
        [transferSym, scv, '*', '*'],
        [transferSym, '*', scv, '*'],
      ];
    });
    const filters = [{ type: 'contract' as const, contractIds: [sac], topics }];

    // The RPC scans a bounded slice per call and hands back a cursor — a single
    // call over a wide window can legitimately return zero matches with more
    // ledgers still unscanned, so ALWAYS follow the cursor (bounded pages).
    const events = [];
    let cursor: string | undefined;
    for (let page = 0; page < 8; page++) {
      const res = await server.getEvents(
        cursor
          ? { cursor, filters, limit: 100 }
          : { startLedger: Math.max(1, latest.sequence - 17_000), filters, limit: 100 },
      );
      events.push(...res.events);
      cursor = (res as { cursor?: string }).cursor;
      if (!cursor) break;
    }

    const out: TxRecord[] = [];
    for (const ev of events) {
      try {
        const topics = ev.topic;
        const from = String(scValToNative(topics[1]!));
        const to = String(scValToNative(topics[2]!));
        const stroops = scValToNative(ev.value) as bigint;
        const sent = mine.has(from);
        out.push({
          id: ev.id,
          type: sent ? 'sent' : 'received',
          amount: (Number(stroops) / 10_000_000).toLocaleString('en-US', { maximumFractionDigits: 4 }),
          asset: 'XLM',
          counterparty: sent ? to : from,
          timestamp: ev.ledgerClosedAt ? Math.floor(new Date(ev.ledgerClosedAt).getTime() / 1000) : 0,
          hash: ev.txHash,
        });
      } catch {
        // skip malformed event
      }
    }
    return out.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  } catch {
    return [];
  }
}

export async function loadHorizonActivity(address: string, limit = 25): Promise<TxRecord[]> {
  // Contract wallets: classic activity lives on the fee-payer G-account, and
  // the contract's OWN transfers come from Soroban events — merge the two.
  let account = address;
  let contractRecords: TxRecord[] = [];
  if (StrKey.isValidContract(address)) {
    const feePayer = await getFeePayerAddress();
    contractRecords = await loadContractSacActivity(feePayer ? [address, feePayer] : [address], limit);
    if (!feePayer) return contractRecords;
    account = feePayer;
  }

  const server = new Horizon.Server(getNetwork().horizonUrl);
  let records: Array<Record<string, unknown>>;
  try {
    const page = await server.payments().forAccount(account).order('desc').limit(limit).call();
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
      const sent = r['from'] === account;
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
      const sent = r['funder'] === account;
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
      const sent = r['from'] === account;
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

  if (contractRecords.length === 0) return out;
  // Merge classic + contract records, dedup by tx hash (a contract spend also
  // appears as the fee-payer's wrapping tx would, if Horizon ever surfaces it),
  // newest first.
  const seen = new Set(out.map((r) => r.hash).filter(Boolean));
  const merged = [...out, ...contractRecords.filter((r) => !r.hash || !seen.has(r.hash))];
  return merged.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}
