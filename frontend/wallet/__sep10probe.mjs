import { Keypair, Transaction, Networks } from '@stellar/stellar-sdk';

const PASSPHRASE = Networks.PUBLIC;
const WEB_AUTH = 'https://api.cowrie.exchange/web_auth';
const KYC = 'https://api.cowrie.exchange/kyc';

// 1. Decode the challenge for the FIXED test address first (analysis only)
const fixedAcct = 'GAE6BEVEA6IH4HLTGU3AEGZZWSLNCCWLKD4GLN2XHLXFFNFB24COWUJY';
let r = await fetch(`${WEB_AUTH}?account=${fixedAcct}`);
let j = await r.json();
console.log('--- challenge status', r.status);
const tx = new Transaction(j.transaction, j.network_passphrase);
console.log('source (should be SIGNING_KEY):', tx.source);
console.log('seq:', tx.sequence, 'fee:', tx.fee, 'ops:', tx.operations.length);
console.log('timebounds:', JSON.stringify(tx.timeBounds));
const mn = Number(tx.timeBounds.minTime), mx = Number(tx.timeBounds.maxTime);
console.log('minTime UTC:', new Date(mn * 1000).toISOString());
console.log('maxTime UTC:', new Date(mx * 1000).toISOString());
console.log('challenge validity window (seconds):', mx - mn, '=', ((mx - mn) / 3600).toFixed(2), 'hours');
for (const [i, op] of tx.operations.entries()) {
  console.log(`op[${i}] type=${op.type} source=${op.source} name="${op.name}" valueLen=${op.value ? op.value.length : 0} value="${op.value ? op.value.toString('utf8').slice(0, 80) : ''}"`);
}
console.log('signatures:', tx.signatures.length);

// verify server signature
const serverKp = Keypair.fromPublicKey('GBQZOJE2GWJU5VBT6NBLD2F3IOVOYUBDAXYUU32XMHDF4RMDOURWV3GT');
console.log('server sig valid:', serverKp.verify(tx.hash(), tx.signatures[0].signature()));

// 2. Full handshake with a keypair we own
const kp = Keypair.random();
console.log('\n--- handshake with fresh (UNFUNDED) account:', kp.publicKey());
r = await fetch(`${WEB_AUTH}?account=${kp.publicKey()}`);
console.log('challenge status:', r.status);
j = await r.json();
if (!j.transaction) { console.log('body:', JSON.stringify(j)); process.exit(0); }
const tx2 = new Transaction(j.transaction, j.network_passphrase);
tx2.sign(kp);
const signedXdr = tx2.toXDR();

r = await fetch(WEB_AUTH, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ transaction: signedXdr }),
});
const txt = await r.text();
console.log('POST /web_auth status:', r.status);
console.log('POST body:', txt.slice(0, 600));

let token = null;
try { token = JSON.parse(txt).token; } catch {}
if (!token) process.exit(0);

// decode JWT payload
const parts = token.split('.');
console.log('\nJWT header:', Buffer.from(parts[0], 'base64url').toString());
console.log('JWT payload:', Buffer.from(parts[1], 'base64url').toString());

// 3. Authenticated SEP-12 GET /customer  (READ ONLY - no data submitted)
for (const path of [
  `${KYC}/customer`,
  `${KYC}/customer?account=${kp.publicKey()}`,
  `${KYC}/customer?account=${kp.publicKey()}&type=sep6-withdraw`,
]) {
  const rr = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
  const t = await rr.text();
  console.log(`\nGET ${path}\n  status ${rr.status}\n  ${t.slice(0, 1500)}`);
}

// 4. Authenticated SEP-6 withdraw probe (read the error, submit nothing real)
const w = await fetch(`https://api.cowrie.exchange/transfer/withdraw?asset_code=NGNT&type=bank_account`, {
  headers: { Authorization: `Bearer ${token}` },
});
console.log('\nGET /transfer/withdraw status:', w.status, '\n ', (await w.text()).slice(0, 800));

const d = await fetch(`https://api.cowrie.exchange/transfer/deposit?asset_code=NGNT&account=${kp.publicKey()}`, {
  headers: { Authorization: `Bearer ${token}` },
});
console.log('\nGET /transfer/deposit status:', d.status, '\n ', (await d.text()).slice(0, 800));
