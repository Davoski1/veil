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
| **Bills — serious rail** | **Monnify Bills API** (verified real: airtime/data/all major DISCOs/DStv/GOtv/education; 0.5–2% commission; email activation required) | Flutterwave Bills v3 (11 categories, but v3→v4 migration risk; IP whitelisting) |
| **Bills — margin rail** | **eBills.africa** (best published rates anywhere: data 10%, airtime 3%, cable/power 1.5%; KYC tiers from email-only) | Plustive (DB-level idempotency, auto-refunds), Pairgate (real `/test` simulate mode) |
| **Stellar-native option** | **NGNC by Link.io** — live SEP-24 anchor (issuer `GASBV6…GXZY6`), proven in LOBSTR; ₦20k min deposit | Thin on-chain liquidity (NGNC→USDC swap problem); Cowrie/NGNT is half-dead — skip |

**Ruled out:** Yellow Card retail (dead Jan 2026; B2B API is strong but KYB/partnership-gated
with undisclosed pricing — revisit at scale), MoonPay (exited Nigeria), Cashramp (no Stellar
— Celo/Optimism/Base only), cNGN (not on Stellar), Baxi (dev portal dead), SquadCo VAS
(airtime/data only), OPay bills (airtime/betting only — prior research), VTpass (banned by fiat).

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
- Busha: confirm Stellar **memo** handling on USDC-XLM withdrawals + webhook latency (sandbox).
- Monnify: confirm individual-vs-CAC live eligibility (research crashed mid-check; KB
  suggests company-named settlement account is required).
- SEC non-custodial-wallet exemption wording — Nigerian counsel.
- eBills/Plustive: load-test before trusting with real float.
