import { Keypair, Transaction } from '@stellar/stellar-sdk';

const WEB_AUTH = 'https://api.cowrie.exchange/web_auth';

async function auth(kp, extra = '') {
  let r = await fetch(`${WEB_AUTH}?account=${kp.publicKey()}${extra}`);
  const body = await r.text();
  if (r.status !== 200) return { status: r.status, body };
  const j = JSON.parse(body);
  const tx = new Transaction(j.transaction, j.network_passphrase);
  const ops = tx.operations.map(o => `${o.name}=${o.value ? o.value.toString('utf8').slice(0, 40) : ''}`);
  tx.sign(kp);
  r = await fetch(WEB_AUTH, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transaction: tx.toXDR() }) });
  const t = await r.text();
  return { status: r.status, body: t, ops, token: (() => { try { return JSON.parse(t).token; } catch { return null; } })() };
}

const kp = Keypair.random();
const a = await auth(kp);
console.log('=== baseline auth', a.status, 'ops:', JSON.stringify(a.ops));
const token = a.token;
const H = { Authorization: `Bearer ${token}` };

// FULL SEP-12 field set
const r = await fetch('https://api.cowrie.exchange/kyc/customer', { headers: H });
console.log('\n=== FULL SEP-12 GET /customer (status ' + r.status + ') ===');
const kyc = await r.json();
console.log('status field:', kyc.status);
console.log('id:', kyc.id);
console.log('field count:', Object.keys(kyc.fields || {}).length);
for (const [k, v] of Object.entries(kyc.fields || {})) {
  console.log(`  ${k.padEnd(26)} type=${String(v.type).padEnd(7)} optional=${v.optional === true} ${v.choices ? 'choices=' + JSON.stringify(v.choices) : ''} :: ${v.description}`);
}
console.log('\nother top-level keys:', Object.keys(kyc).filter(k => k !== 'fields'));
console.log('provided_fields:', JSON.stringify(kyc.provided_fields));

// client_domain support (the B2B2C / registered-wallet mechanism)
console.log('\n=== SEP-10 client_domain support ===');
for (const cd of ['cowrie.exchange', 'example.com']) {
  const rr = await fetch(`${WEB_AUTH}?account=${Keypair.random().publicKey()}&client_domain=${cd}`);
  const tt = await rr.text();
  let opsTxt = '';
  try { const jj = JSON.parse(tt); const t2 = new Transaction(jj.transaction, jj.network_passphrase); opsTxt = t2.operations.map(o => o.name).join(','); } catch { opsTxt = tt.slice(0, 200); }
  console.log(`client_domain=${cd} -> ${rr.status} ops:[${opsTxt}]`);
}
// memo / muxed support (custodial sub-account pattern)
const rm = await fetch(`${WEB_AUTH}?account=${kp.publicKey()}&memo=1234`);
console.log('memo=1234 ->', rm.status, (await rm.text()).slice(0, 200));

// SEP-31
console.log('\n=== SEP-31 ===');
for (const u of [
  'https://api.cowrie.exchange/sep31/direct/info',
  'https://api.cowrie.exchange/sep31/direct/transactions',
  'https://api.cowrie.exchange/sep31/direct',
]) {
  const rr = await fetch(u, { headers: H });
  const t = await rr.text();
  console.log(`GET ${u} -> ${rr.status} :: ${t.slice(0, 500).replace(/\s+/g, ' ')}`);
}
const rr31 = await fetch('https://api.cowrie.exchange/sep31/direct/info');
console.log(`GET /sep31/direct/info (NO auth) -> ${rr31.status} :: ${(await rr31.text()).slice(0, 400).replace(/\s+/g, ' ')}`);

// Federation
console.log('\n=== FEDERATION ===');
for (const q of ['?q=support*cowrie.exchange&type=name', `?q=GAWODAROMJ33V5YDFY3NPYTHVYQG7MJXVJ2ND3AOGIHYRWINES6ACCPD&type=id`, '']) {
  const u = 'https://api.cowrie.exchange/federation' + q;
  const rr = await fetch(u);
  console.log(`GET ${u} -> ${rr.status} :: ${(await rr.text()).slice(0, 300).replace(/\s+/g, ' ')}`);
}

// SEP-6 endpoints authenticated
console.log('\n=== SEP-6 authenticated ===');
const probes = [
  `https://api.cowrie.exchange/transfer/deposit?asset_code=NGNT&account=${kp.publicKey()}&amount=1000`,
  `https://api.cowrie.exchange/transfer/withdraw?asset_code=NGNT&type=bank_account&account=${kp.publicKey()}&amount=1000&dest=0123456789&dest_extra=GTBank`,
  `https://api.cowrie.exchange/transfer/transactions?asset_code=NGNT&account=${kp.publicKey()}`,
  `https://api.cowrie.exchange/asset_info`,
  `https://api.cowrie.exchange/auth`,
];
for (const u of probes) {
  const rr = await fetch(u, { headers: H });
  const t = await rr.text();
  console.log(`GET ${u.replace(kp.publicKey(), '<G..>')}\n   -> ${rr.status} :: ${t.slice(0, 400).replace(/\s+/g, ' ')}`);
}
