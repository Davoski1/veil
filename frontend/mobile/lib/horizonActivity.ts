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
 * A smart wallet's own transfers are SAC `transfer` EVENTS (invoke ops), which
 * Horizon's payments feed never surfaces. Read them from Soroban RPC's event
 * store instead — but frugally:
 *
 * - QuickNode (mainnet) rejects wide getEvents windows outright with -32001
 *   "request exceeded processing limit threshold" (~3k ledgers max per
 *   request), so scans go chunk by chunk.
 * - The dashboard polls every 15s; a full backscan on every poll would hammer
 *   the RPC into rate-limiting everything sharing the endpoint (balances,
 *   nonce probes). So the backscan runs ONCE per session, its results are
 *   cached, and later calls only scan the few ledgers closed since — one or
 *   two requests per poll at steady state.
 */
const CHUNK = 2_900; // ≈ 4h of ledgers, under QuickNode's processing cap
const BACKSCAN_CHUNKS = 3; // ≈ 12h initial lookback
const MAX_CACHED = 50;

const sacScan: { key: string; lastLedger: number; records: TxRecord[] } = {
  key: '',
  lastLedger: 0,
  records: [],
};

/** Scan one [start, end] window, following the cursor a few pages. */
async function scanWindow(
  server: SorobanRpc.Server,
  filters: SorobanRpc.Server.GetEventsRequest['filters'],
  startLedger: number,
  endLedger: number,
): Promise<SorobanRpc.Api.EventResponse[]> {
  const events: SorobanRpc.Api.EventResponse[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 4; page++) {
    // Follow-up pages: cursor and ledger range are mutually exclusive per the
    // RPC, so the walk can overrun endLedger into already-covered ledgers —
    // the id-dedupe downstream absorbs the overlap.
    const res = await server.getEvents(
      cursor ? { cursor, filters, limit: 100 } : { startLedger, endLedger, filters, limit: 100 },
    );
    events.push(...res.events);
    cursor = (res as { cursor?: string }).cursor;
    if (!cursor) break;
  }
  return events;
}

async function loadContractSacActivity(addresses: string[], limit: number): Promise<TxRecord[]> {
  const net = getNetwork();
  const key = `${net.name}|${[...addresses].sort().join(',')}`;
  const cached = sacScan.key === key ? sacScan : null;
  try {
    const mine = new Set(addresses);
    const server = new SorobanRpc.Server(net.rpcUrl);
    const sac = Asset.native().contractId(net.networkPassphrase);
    const latest = await server.getLatestLedger();

    const transferSym = xdr.ScVal.scvSymbol('transfer').toXDR('base64');
    const topics = addresses.flatMap((a) => {
      const scv = xdr.ScVal.scvAddress(new Address(a).toScAddress()).toXDR('base64');
      return [
        [transferSym, scv, '*', '*'],
        [transferSym, '*', scv, '*'],
      ];
    });
    const filters = [{ type: 'contract' as const, contractIds: [sac], topics }];

    const events: SorobanRpc.Api.EventResponse[] = [];
    const incremental = !!cached && cached.lastLedger > 0 && latest.sequence - cached.lastLedger < CHUNK;
    if (incremental) {
      if (latest.sequence > cached.lastLedger) {
        // One small window since the last scan; on failure keep the cache and
        // DON'T advance, so the next poll retries the same span.
        try {
          events.push(...(await scanWindow(server, filters, cached.lastLedger + 1, latest.sequence)));
        } catch {
          return cached.records.slice(0, limit);
        }
      }
    } else {
      // Full backscan, newest chunk first so partial coverage keeps the most
      // recent activity. A failed chunk retries once at half width (the RPC's
      // cost estimate varies with ledger contents), then concedes its slice.
      for (let c = 0; c < BACKSCAN_CHUNKS; c++) {
        const endLedger = latest.sequence - c * CHUNK;
        for (const width of [CHUNK, Math.floor(CHUNK / 2)]) {
          try {
            events.push(...(await scanWindow(server, filters, Math.max(1, endLedger - width + 1), endLedger)));
            break;
          } catch {
            // fall through to the narrower width, or concede the chunk
          }
        }
        if (endLedger - CHUNK + 1 <= 1) break;
      }
    }

    const fresh: TxRecord[] = [];
    for (const ev of events) {
      try {
        const topic = ev.topic;
        const from = String(scValToNative(topic[1]!));
        const to = String(scValToNative(topic[2]!));
        const stroops = scValToNative(ev.value) as bigint;
        const sent = mine.has(from);
        fresh.push({
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

    // Merge with the cache, dedupe by event id, newest first.
    const seen = new Set<string>();
    const merged: TxRecord[] = [];
    for (const r of [...fresh, ...(incremental && cached ? cached.records : [])]) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      merged.push(r);
    }
    merged.sort((a, b) => b.timestamp - a.timestamp);

    sacScan.key = key;
    sacScan.lastLedger = latest.sequence;
    sacScan.records = merged.slice(0, MAX_CACHED);
    return sacScan.records.slice(0, limit);
  } catch {
    return cached ? cached.records.slice(0, limit) : [];
  }
}

/** Map a Horizon payments page for `account` into TxRecords. */
async function loadClassicActivity(account: string, limit: number): Promise<TxRecord[]> {
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
  return out;
}

/**
 * Load an account's recent activity. Classic wallets read Horizon's payments
 * feed directly. Contract wallets merge two sources IN PARALLEL — the
 * fee-payer G-account's classic payments and the contract's SAC transfer
 * events — so a slow event scan never delays the classic half.
 */
export async function loadHorizonActivity(address: string, limit = 25): Promise<TxRecord[]> {
  if (!StrKey.isValidContract(address)) {
    return loadClassicActivity(address, limit);
  }

  const feePayer = await getFeePayerAddress();
  const [contractRecords, classic] = await Promise.all([
    loadContractSacActivity(feePayer ? [address, feePayer] : [address], limit),
    feePayer ? loadClassicActivity(feePayer, limit) : Promise.resolve([]),
  ]);

  if (contractRecords.length === 0) return classic;
  // Merge classic + contract records, dedup by tx hash (a contract spend also
  // appears as the fee-payer's wrapping tx would, if Horizon ever surfaces
  // it), newest first.
  const seen = new Set(classic.map((r) => r.hash).filter(Boolean));
  const merged = [...classic, ...contractRecords.filter((r) => !r.hash || !seen.has(r.hash))];
  return merged.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}
