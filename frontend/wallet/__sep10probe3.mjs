import { Keypair, Transaction, Networks, WebAuth } from '@stellar/stellar-sdk';

const WEB_AUTH = 'https://api.cowrie.exchange/web_auth';
const SIGNING_KEY = 'GBQZOJE2GWJU5VBT6NBLD2F3IOVOYUBDAXYUU32XMHDF4RMDOURWV3GT';

const kp = Keypair.random();
let r = await fetch(`${WEB_AUTH}?account=${kp.publicKey()}`);
const j = await r.json();

// --- Does the STANDARD SDK validator accept this challenge? ---
console.log('=== SEP-10 spec conformance via @stellar/stellar-sdk WebAuth.readChallengeTx ===');
for (const [label, homeDomain, webAuthDomain] of [
  ['homeDomain=cowrie.exchange, webAuthDomain=api.cowrie.exchange (per TOML WEB_AUTH_ENDPOINT host)', 'cowrie.exchange', 'api.cowrie.exchange'],
  ['homeDomain=cowrie.exchange, webAuthDomain=cowrie.exchange', 'cowrie.exchange', 'cowrie.exchange'],
]) {
  try {
    WebAuth.readChallengeTx(j.transaction, SIGNING_KEY, Networks.PUBLIC, homeDomain, webAuthDomain);
    console.log(`  PASS  ${label}`);
  } catch (e) {
    console.log(`  FAIL  ${label}\n        -> ${e.message}`);
  }
}

const tx = new Transaction(j.transaction, j.network_passphrase);
tx.sign(kp);
r = await fetch(WEB_AUTH, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transaction: tx.toXDR() }) });
const token = (await r.json()).token;
const H = { Authorization: `Bearer ${token}` };

console.log('\n=== FULL SEP-31 /info ===');
const s31 = await (await fetch('https://api.cowrie.exchange/sep31/direct/info')).json();
console.log(JSON.stringify(s31, null, 2));

console.log('\n=== SEP-12 by type (delegated-KYC probe) ===');
for (const t of ['sep31-sender', 'sep31-receiver', 'sep6-deposit', 'sep6-withdraw', 'entity', 'bogus-type-xyz']) {
  const rr = await fetch(`https://api.cowrie.exchange/kyc/customer?type=${t}`, { headers: H });
  const body = await rr.text();
  let summary;
  try {
    const o = JSON.parse(body);
    summary = `status=${o.status} fields=[${Object.keys(o.fields || {}).join(', ')}]`;
  } catch { summary = body.slice(0, 200); }
  console.log(`  type=${t.padEnd(15)} -> ${rr.status}  ${summary}`);
}

console.log('\n=== SEP-12 other verbs / endpoints (no data submitted) ===');
for (const [m, u] of [['DELETE', `https://api.cowrie.exchange/kyc/customer/${kp.publicKey()}`], ['GET', 'https://api.cowrie.exchange/kyc/customer/callback'], ['GET', 'https://api.cowrie.exchange/kyc/customer/files']]) {
  const rr = await fetch(u, { method: m, headers: H });
  console.log(`  ${m} ${u.replace(kp.publicKey(), '<G..>')} -> ${rr.status} :: ${(await rr.text()).slice(0, 150).replace(/\s+/g, ' ')}`);
}

console.log('\n=== SEP-38 / SEP-24 / SEP-1 alt paths (declared? reachable?) ===');
for (const u of [
  'https://api.cowrie.exchange/sep24/info',
  'https://api.cowrie.exchange/sep38/info',
  'https://api.cowrie.exchange/',
  'https://cowrie.exchange/',
]) {
  const rr = await fetch(u, { redirect: 'manual' });
  console.log(`  GET ${u} -> ${rr.status} ${rr.headers.get('location') || ''} (${(rr.headers.get('content-type') || '').split(';')[0]})`);
}
