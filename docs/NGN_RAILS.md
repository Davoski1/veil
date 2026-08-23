# NGN rails for Veil — onramp, conversion, bills

_Research completed 2026-08-21 (5 web-research agents + 3 adversarial verifications; all
three load-bearing claims CONFIRMED). This is the reference for the "naira in → USDC out,
bills paid" product layer._

## The idea being validated

> "When users are in naira view and press Receive, it creates a Nigerian bank account
> number they can transfer to; deposits onramp to Stellar."

**Verdict: not crazy — it's the standard onramp pattern** (Bitnob does exactly this with
per-user unique account numbers; Roqqu similarly; Beans App is the closest Stellar
analogue). Veil's twist — the crypto stays invisible behind a naira balance on a
self-custodial smart wallet — is the differentiator, not the risk.

## The three verified claims

1. **Per-user NGN virtual accounts without a PSP licence: CONFIRMED.** The provider holds
   the CBN licence; you're a merchant. Flutterwave even onboards an **"Unregistered
   Business Account"** (BVN + NIN + ID + website/social page + proof of address) — a
   pre-CAC path. Paystack/Monnify want CAC + company-named settlement accounts.
2. **Programmatic NGN → USDC on Stellar: CONFIRMED.** **Busha Business API**
   (SEC/ARIP-licensed, docs verified live 2026-08-21): NGN bank-transfer deposits (flat
   ₦150) → quote-locked conversion → **USDC-XLM withdrawal** (1 USDC fee). Native XLM too.
3. **"Licensed partner converts, we do UX + self-custody": CONFIRMED.** Busha Business
   explicitly markets its "SEC-licensed infrastructure" API for unlicensed fintechs to
   build wallets/payment flows on. Caveat: the SEC's non-custodial-wallet exemption
   wording is still the one unresolved legal detail — get a Nigerian counsel read before
   mainnet launch.

## Recommended stack

| Layer | Primary | Fallback / notes |
|---|---|---|
| **Onramp (deposit → USDC-XLM)** | **Busha Business** end-to-end (their virtual accounts + conversion + Stellar payout, memo required) | Split model: Monnify reserved accounts (1.5% capped ₦2k / ₦500 flat, same-day settlement incl. weekends) collecting, Busha converting |
| **Virtual accounts (if split)** | Monnify (BVN/NIN per user, CAC required) | Flutterwave (2% UNCAPPED — poor for big deposits, but unregistered-business path exists); **NEVER Paystack** — their ToS explicitly ban crypto operators |
| **Bills — build FIRST** | **eBills.africa** — the only rail an individual can sign up for today *and* whose timeouts are recoverable (see §Bills deep-dive) | — |
| **Bills — once we have an entity** | **Monnify Bills API** (real sandbox; explicit "requery does not re-charge"; 0.5–2% commission; needs activation email + merchant review) | Flutterwave Bills v3 (11 categories, but v3→v4 migration risk; IP whitelisting) |
| **Bills — fallbacks** | Plustive (best idempotency of the four, but sales-provisioned + static-IP allowlist) | Pairgate (real `/test` mode, but unrecoverable timeouts — see deep-dive; **do not make it primary**) |
| **Stellar-native option** | **NGNC by Link.io** — live SEP-24 anchor (issuer `GASBV6…GXZY6`), proven in LOBSTR; ₦20k min deposit | Thin on-chain liquidity (NGNC→USDC swap problem); Cowrie/NGNT is half-dead — skip |

**Ruled out:** Yellow Card retail (dead Jan 2026; B2B API is strong but KYB/partnership-gated
with undisclosed pricing — revisit at scale), MoonPay (exited Nigeria), Cashramp (no Stellar
— Celo/Optimism/Base only), cNGN (not on Stellar), Baxi (dev portal dead), SquadCo VAS
(airtime/data only), OPay bills (airtime/betting only — prior research), VTpass (banned by fiat).

## Offramp deep-dive — USDC-on-Stellar → NGN → bank

_Researched 2026-08-23 against `docs.busha.io` (all 131 pages), the official OpenAPI spec (9,359 lines), and **live unauthenticated probes of both `api.busha.co` and `api.sandbox.busha.so`**. Every claim below marked "verified" was reproduced 3× and deterministic._

### The three answers that matter

1. **USDC-on-Stellar offramp works in PRODUCTION** — verified empirically, not inferred.
2. **Native XLM offramp does NOT work** — deterministic 503, and it would cost 4.5× more anyway.
3. **You CANNOT demo the USDC-on-Stellar offramp in SANDBOX** — the decisive constraint on a build-before-CAC plan.

### Verified probe results

| Test | Env | Result |
|---|---|---|
| `USDC` + `pay_in{address, network:XLM}` → NGN | **PROD** | **201 CREATED** |
| same | SANDBOX | **503 service_unavailable** |
| `XLM` native + `pay_in{address, network:XLM}` | PROD | **503** |
| `USDC` + `network:BANANANET` (control) | PROD | `400 "BANANANET is not supported by USDC"` |
| `USDC`/`XLM` → NGN via `pay_in: balance` | SANDBOX | **201** |

The bogus-network control is load-bearing: the `network` field **is** server-side validated, so `XLM` returning 201 for USDC means production genuinely accepts Stellar — it isn't ignoring the field. Root cause of the failures is a currency-level `is_ramp_sell_supported` flag: production enables USDC, **sandbox does not**, and `XLM` is disabled in both.

### The flow (no dedicated "offramp" endpoint — it's one quote→transfer primitive)

```
POST /v1/recipients/resolve-bank-account   → account_name (verify before showing the user)
POST /v1/recipients  {type: ngn_bank}      → recipient_id
POST /v1/quotes  {source: USDC, target: NGN,
                  pay_in:  {type: address, network: XLM},
                  pay_out: {type: bank_transfer, recipient_id},
                  header X-BU-PROFILE-ID: <customer_id>}   ← B2B2C attribution
POST /v1/transfers {quote_id}              → pay_in.address (+ pay_in.memo?)
   user sends USDC on Stellar (min 2 USDC, before pay_in.expires_at)
GET  /v1/transfers/{id}  +  webhooks
```
`GET /v1/banks?currency=NGN&country=NG` is public and returns 173 banks. **Quotes expire in 30 minutes** — always mint a fresh one immediately before `POST /v1/transfers`.

### ⚠️ The memo question — unresolved, and it's the one that can lose user funds

**Not documented anywhere.** What is known:
- The **request** schema (`PayInObj`) has no memo field — you cannot supply one.
- The **response** schema does: `PaymentObj` includes `memo`, `address`, `expires_at`. So the deposit-address response *can* carry one.
- Stellar is the **only** network with a named memo example in the entire spec (`crypto_stellar_lumens_with_memo`) — but it's an *outbound recipient* example, not a deposit.
- The XLM `address_regex` is `^G[A-D]{1}[A-Z2-7]{54}$` — **plain G-addresses only, no muxed M-addresses.** Muxed is the only memo-free way to attribute deposits on a shared Stellar account, so its absence points toward memos.
- Documented attribution elsewhere is by **unique per-transfer address with `expires_at`**, not memo.

**Engineering rule: always read and honour `pay_in.memo` if present; never assume a bare G-address deposit gets credited.**

### Costs — the spread is the real fee, and it is observable

Measured live from `/v1/pairs` on 2026-08-23:

| Pair | Sell rate (ours) | Haircut vs mid | Round-trip |
|---|---|---|---|
| **USDCNGN** | 1382.12 | **0.59%** | 1.19% |
| XLMNGN | 261.39 | **2.66%** | 5.31% |

**Route through USDC, never offramp native XLM** — 4.5× the spread. Plus **₦107.50** flat payout fee (VAT inclusive) and **₦50 stamp duty** above ₦9,999; no crypto-deposit fee exists. Doc examples contradict the fee page, so **treat the quote's `fees[]` array as authoritative**. Minimums: 2 USDC in, ₦499 out (max ₦100m).

Business KYB limits: Sole Prop tier 1 = $100k/day, LLC tier 1 = $1m/day, LLC tier 2 unlimited. **End-customer individual tier limits are NOT published** — a real gap; we cannot model per-user caps from public docs.

### Settlement, webhooks

`/v1/countries` gives NGN bank-transfer `processing_time: "0-15 minutes"`, defined in the spec as an **average, not an SLA**. NIP/NIBSS is **never named** in any Busha document, and there is **no weekend/holiday or cut-off statement** — the docs hedge once about "banking hours", and the retail ToS ("each business day") contradicts the Corporate Agreement ("instantly").

Webhooks: `x-bu-signature` = base64(HMAC-SHA256(raw_body, secret)). Offramp-relevant events include `transfer.funds_received → funds_converted → outgoing_payment_sent → funds_delivered`, plus `transfer.failed`, `funds_not_delivered`, and `funds_refunded`. ⚠️ **The offramp sequence itself is never documented** — that chain is inferred by symmetry with the documented on-ramp.

### Restrictions

- **Source-address whitelisting: does not exist.** Zero hits across all 131 pages and the full spec; the per-transfer generated-address model is structurally incompatible with it.
- **Travel rule / source-of-funds: thorough negative.** No vendor named (no Chainalysis/Elliptic/TRM/Notabene/Sumsub), no API surface to submit originator data, no compliance/hold status in the documented status set, and **no statement anywhere about deposits from unhosted wallets**. They're a licensed VASP so screening almost certainly happens — but it is undocumented, so plan for the possibility without being able to cite rules.
- **Payout to a bank account not in the end-customer's name:** the retail ToS bans it outright, but that document **explicitly excludes corporates**, and the Corporate Client Agreement contains no such prohibition. `Recipient.owned_by_customer` is response-only (Busha computes it) and models both states. **Not affirmatively permitted in writing — get this confirmed before building on it.**

### What this means for building before CAC

**Sandbox business accounts are auto-verified — no CAC needed** (`sandbox.dash.busha.io/business/signup`, verified live). Production access requires **KYB = Certificate of Incorporation**, ~72h turnaround. So:

- ✅ Buildable today: the whole quote → transfer → webhook pipeline, demoed either with **USDT on TRX/ETH/BSC** (verified 201 in sandbox) or with **`pay_in: balance`** for USDC→NGN, which exercises conversion + payout and stubs only the Stellar deposit leg.
- ❌ Not demoable today: the actual USDC-on-Stellar deposit, because sandbox lacks the ramp-sell flag and its "Test Addresses For Off-Ramp Operations" page lists 9 networks with **Stellar absent**.
- Minor doc bug: the sandbox widget host `sandbox.sell.busha.io` is NXDOMAIN; the working host is `sandbox.sell.busha.co`.

### Questions to put to Busha in writing

1. Does `pay_in` for USDC-on-Stellar return a **`memo`**, is it mandatory, and what happens to a memo-less deposit? (We cannot test this — no Stellar sandbox asset exists.)
2. Will `POST /v1/transfers` actually issue a Stellar deposit address, given `USDC-XLM` is flagged `is_ramp_sell_supported: false` at **network** level even though the quote succeeds at **currency** level? *(This is the single biggest unverifiable risk in the whole path.)*
3. Does the Corporate Client Agreement permit NGN payouts to a bank account **not in the end customer's name**?
4. Can sandbox `USDC` be ramp-sell-enabled? **That one flag is all that stands between us and a complete pre-registration demo.**

## Bills deep-dive — implementation reference

_Second research pass 2026-08-23: every provider's live API probed unauthenticated, **with a bogus-path 404 control on each host** so that a `401` actually proves a route exists. eBills/Pairgate/Plustive passed the control (route existence verified); **Monnify's gateway 401s before routing**, so its paths come from the official Node SDK source, not from probing._

### ⚠️ Correction: the "data 10%" premise is mostly wrong

The table above previously sold eBills on 10% data margins. Live pricing (computed from the undocumented `reseller_price` field on the public variations endpoint) says otherwise:

| Network | plans | median margin | max | SME |
|---|---|---|---|---|
| MTN | 39 | **1.00%** | 1.00% | **0.00%** |
| Airtel | 36 | 1.00% | 2.33% | 2.33% |
| Glo | 18 | 2.00% | **10.00%** | 10.00% |
| 9mobile | 10 | 2.00% | 2.00% | — |
| Smile | 12 | 3.00% | 3.00% | — |

**10% exists only on Glo SME. MTN SME — the volume driver in Nigeria — is 0.00%**, contradicting eBills' own published rate card. Airtime (2.5% MTN / 3% others) does match. **No revenue model may assume 10%**; re-verify on a funded account.

### The property that decides everything: can you recover a timed-out vend?

A bill vend that times out may or may not have delivered. If you cannot ask "what happened to *my* reference?", you have an unresolvable orphan that charged a real user.

| | eBills | Monnify | Pairgate | Plustive |
|---|---|---|---|---|
| Sign up today, no CAC | ✅ individual form | ❌ activation email + merchant review | ✅ individual form | ❌ sales-provisioned |
| Sandbox / test | ❌ none | ✅ real sandbox | ⚠️ `/test` stub (verified real, static) | ❌ none |
| **Recover a timed-out vend** | ✅ requery by *our* `request_id` | ✅ requery, "does not re-charge" | ❌ **only by server `reference_code`** | ✅ replay + lookup by `clientReference` |
| True idempotent replay | ⚠️ ambiguous 3-min window | ❓ undocumented | ❌ 422 reject | ✅ replay flag + 409 conflict |
| Auto-refund | ✅ (no SLA) | ❌ undocumented | ✅ (no SLA) | ✅ **in the ToS** (no SLA) |
| Webhook on vend result | ⚠️ manual-complete + refund only | ❌ **no bills event exists** | ✅ HMAC, 3 retries | ✅ HMAC, terminal only |
| Published rate limit | ❌ | ❌ | ✅ 60/min | ❌ |
| Serverless-friendly | ✅ | ✅ | ⚠️ unresolved | ❌ **static egress IP required** |

**Poll, don't trust webhooks.** eBills fires nothing on ordinary success and Monnify has no bills webhook at all, so a requery/reconciliation loop is mandatory infrastructure for both primary rails.

### eBills — the first adapter

- **`https://ebills.africa/wp-json`** (WordPress REST). **No sandbox** — docs advise small live transactions.
- Auth: `POST /jwt-auth/v1/token` with dashboard username/password → 7-day JWT, then `Bearer`. **Only the newest token stays valid** — never let two workers log in independently. IP allowlist optional.
- Verified routes: `GET /api/v2/balance`; `GET /api/v2/variations/data?service_id=mtn` and `/variations/tv` (**public, no auth**); `POST /api/v2/verify-customer`; `POST /api/v2/{airtime,data,electricity,tv,epins,betting}`; `POST /api/v2/requery`. There is **no** `variations/electricity`, `variations/airtime`, or `/services` — those `service_id` lists must be hardcoded.
- Purchase body `{request_id, phone|customer_id, service_id, variation_id|amount}`; electricity verify returns the richest payload of the four (`customer_name`, `address`, `arrears`, `min/max_purchase_amount`).
- **Idempotency:** `request_id` ≤50 chars, and requery takes it back — so a lost response is always recoverable. Caveat: docs define two conflicting 409s (`duplicate_request_id` = permanent vs `duplicate_order` = 3-minute window), so whether a replay after 3 minutes double-vends is **genuinely ambiguous**. Until support confirms: **on timeout, requery — never blind-retry.**
- Webhook signature is HMAC-SHA256 keyed on your **account transaction PIN**, which couples webhook verification to a spending credential — treat that PIN as a high-value secret.
- `429 wallet_busy` exists alongside `429 rate_limit_exceeded`; back off on both. Top-up mechanism is undocumented publicly.
- **Onboarding: name/email/phone/password, no CAC field.** Tier 1 (email) ₦50k/day → Tier 2 (BVN) ₦500k/day → Tier 3 unlimited. **One gate to resolve on day one:** transactional endpoints need the **"reseller role"**, and whether that costs money or needs approval is behind the login wall.

### Monnify — right rail, wrong time

Sandbox `https://sandbox.monnify.com`, live `https://api.monnify.com`; `Basic base64(apiKey:secretKey)` → bearer token. Paths (from the official SDK): `/api/v1/vas/bills-payment/{biller-categories,billers,biller-products,validate-customer,vend,requery}`. `validate-customer` is **mandatory before vending** and returns `vendInstruction.requireValidationRef`. **Field-name conflict:** docs say `vendAmount`/`vendReference`, the SDK validator requires `amount`/`reference` — production implementations send **all four** until confirmed. `vendStatus` takes precedence over `status`. Vend needs a **>5s timeout** (30s in practice). Bills debit the merchant account with commission credited at settlement — not a separate float wallet; the `Low Balance Alert` webhook is the float monitor. **Refunds for failed vends are undocumented** — a real gap. Onboarding needs an activation email *plus* corporate KYC (TIN, CAC, MemArt, board resolution, settlement account in the business name); a community-reported "Starter Business" path could **not** be confirmed on any official page.

### Pairgate — do not make it primary

`https://pairgate.com/api/v1`, static bearer key, self-serve individual signup. The **`/test` simulate mode is real** (verified: `/api/v1/test/data/purchase` is POST-only and exists, bogus paths 404) but it is a **static stub** — different response shape, no `reference_code`, no webhook, always succeeds. The disqualifier: you send `reference`, it returns a *different* `reference_code`, a duplicate `reference` gets **422 with no `reference_code` in the body**, and `GET /transaction/status` accepts **only** `reference_code`. One timed-out purchase therefore becomes permanently unresolvable. Also 60 req/min (≈12–20 orders/min at 3–5 calls each) with no `Retry-After`, and no funding API.

### Plustive — best engineered, hardest to reach

Correct host is **`plustiveimpact.com`** (plain `plustive.com` is dead). API `https://api.plustiveimpact.com`, and the path prefix is **`/api/v1`** — marketing writes `/v1` and is wrong; the advertised OpenAPI spec 404s. **All money is integer kobo except airtime `amount`, which is whole naira.** Best idempotency of the four: replay returns the original with `idempotentReplay: true`, differing params give `409 idempotency_conflict`, and lookup accepts your own `clientReference`. Auto-refund is **contractual (in the ToS)**, not just marketing. Blockers: **no self-serve signup at all** (sales-provisioned) and **manual IP allowlisting** since July 2026, which rules out dynamic serverless egress. The "DB-level idempotency on `request_id`" note in earlier research was half-invented — the field is `clientReference` and the DB claim appears only on marketing pages.

## Regulatory guardrails (Aug 2026)

- **ISA 2025** makes digital assets securities; fiat↔crypto conversion = licensed VASP
  activity. 14 ARIP approval-in-principle holders incl. Quidax, Busha, Luno, Yellow Card.
  Minimum capital ₦300M–₦2B (Circular 26-1) — partnering is economically forced, and legal.
- **Veil's posture**: self-custody wallet software (the "on behalf of others" hinge keeps
  it outside VASP scope — the one item needing counsel confirmation); Busha does
  conversion under its licence; unauthorized conversion = ₦10–20M penalties.
- **KYC**: BVN or NIN is mandatory for every per-user virtual account (CBN tiered KYC;
  Tier 1 = BVN *or* NIN ≈ ₦300k limits; Tier 2 = both). The ₦-Receive flow needs a
  BVN/NIN capture step. "Invisible" can't mean "anonymous" on the fiat leg.
- **Bills**: route through licensed aggregators (Monnify/eBills) — their NCC/NERC
  licences cover the vend; reseller-needs-no-licence is the working assumption (inference,
  not verified rule).
- **July 2026 Executive Order**: payments-style stablecoin flows may migrate toward CBN
  jurisdiction — watch.

## Phased build

**Adapter design rule (settled by the bills research):** the `BillsProvider` interface must be built around **"requery by *our* reference"**. eBills, Monnify and Plustive all support it; Pairgate does not — so Pairgate becomes the single implementation that has to persist a `reference → reference_code` mapping, instead of its weaker model leaking into the core interface.

**Phase 0 — testnet, no partner (start now):**
naira Receive tab shows a bank-account panel (mock number) + "deposits become dollars
automatically"; a dev webhook simulates the deposit → credits testnet USDC to the smart
wallet; bill tiles run against a sandbox (Pairgate `/test` or Plustive). Proves the entire
UX; this is the SCF demo.

**Phase 1 — paperwork (parallel):** CAC registration (gates Monnify + Busha Business
live access); Busha Business signup + KYB; Monnify account + bills activation email;
eBills tier-2 (BVN). Optional: Flutterwave unregistered account as an early live toehold.

**Phase 2 — live rails:** `OnrampProvider` + `BillsProvider` adapter interfaces (never
couple money-in and bill-delivery); Busha adapter (webhook → quote → USDC-XLM payout to
user C-address **with memo**), Monnify bills adapter with eBills fallback; float
dashboards for the two prefunded wallets.

## Open items

**Needs a human with a login (cannot be desk-researched):**
- **eBills "reseller role"** — transactional endpoints require it; cost/approval is behind the login wall. Thirty minutes of clicking settles it. *Blocks the first adapter.*
- **eBills duplicate semantics** — does replaying a `request_id` after the 3-minute `duplicate_order` window create a **second vend**? Ask support before any retry logic ships.
- **eBills margins on a funded account** — confirm the live 1%-median finding before any revenue model depends on it.
- **eBills top-up mechanism** — undocumented publicly.

**Emails to send now (weeks of lead time, none block the eBills build):**
- **Monnify** — bills activation request, and whether the community-reported "Starter Business" (no-CAC) path is real.
- **Plustive** (`contact@plustiveimpact.com`) — do they onboard an unregistered sole developer, is there any test credential, and which static egress IPs do they need.

**Still open from the first pass:**
- Busha: confirm Stellar **memo** handling on USDC-XLM withdrawals + webhook latency (sandbox).
- SEC non-custodial-wallet exemption wording — Nigerian counsel.
- Monnify vend field names (`amount`/`reference` vs `vendAmount`/`vendReference`) — confirm against sandbox; send both pairs until then.
- Pairgate IP allowlisting — marketed as mandatory, absent from the auth docs, no error code exists.
- Load-test whichever rail gets real float.
