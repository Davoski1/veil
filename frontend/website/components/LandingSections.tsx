/**
 * The three sections Talise's landing has and ours did not: a capability grid,
 * a security/trust block, and an FAQ.
 *
 * Honesty rule applied throughout: every capability carries a Live or Coming
 * tag, and nothing in the trust block or the FAQ is a claim we cannot point at
 * code or a ledger entry for. A landing page that implies bills already work
 * would be the same mistake the wallet's /bills screen deliberately refuses to
 * make.
 */

type Capability = { name: string; blurb: string; live: boolean }

const CAPABILITIES: Capability[] = [
  { name: 'Passkey sign-in', blurb: 'Face or fingerprint. No seed phrase exists to lose.', live: true },
  { name: 'Sponsored fees', blurb: 'You never hold a gas token. Veil pays the network.', live: true },
  { name: 'Send & receive', blurb: 'To any Stellar address, settled in about five seconds.', live: true },
  { name: 'Swap', blurb: 'Best route across pools through the Soroswap aggregator.', live: true },
  { name: 'Local currency', blurb: 'Read your balance in naira, cedi, shilling or dollars.', live: true },
  { name: 'AI agent', blurb: 'Ask for a transfer; it builds it, you sign it.', live: true },
  { name: 'Earn', blurb: 'Put idle USDC to work in the Blend pool.', live: true },
  { name: 'Bills & airtime', blurb: 'Airtime, data, power and TV, paid from your balance.', live: false },
]

const TRUST: { title: string; body: string }[] = [
  {
    title: 'Non-custodial by construction',
    body: 'Your wallet is a contract only your passkey can authorise. Veil cannot move your money, freeze it, or sign on your behalf — there is no key on our side to do it with.',
  },
  {
    title: 'Builds you can verify',
    body: 'The contracts are compiled reproducibly in a pinned container. The bytecode running on Stellar mainnet matches our published hashes byte for byte, and you can rebuild it yourself to check.',
  },
  {
    title: 'A published threat model',
    body: 'We wrote down how Veil could be attacked, using STRIDE, and shipped it in the docs rather than keeping it internal. Known limitations are listed alongside the mitigations.',
  },
  {
    title: 'Open source, MIT',
    body: 'The wallet, the contracts, the oracle and the indexer are all public and permissively licensed. Nothing about how your money moves is hidden from you.',
  },
]

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Do I need to know anything about crypto?',
    a: 'No. You sign in with your face or fingerprint, and your balance is shown in your own currency. There is no seed phrase to write down, no gas token to buy, and no wallet address to memorise before you can be paid.',
  },
  {
    q: 'Is the money actually mine?',
    a: 'Yes, and provably. Your funds sit in a smart contract that only your passkey can authorise. Veil holds no key that can move them, so there is nothing for us to freeze, lend out or lose. The trade-off is real: self-custody means no support line can reverse a transaction you signed.',
  },
  {
    q: 'What happens if I lose my phone?',
    a: 'Your passkey lives in your device’s keychain and, for most people, syncs through Apple or Google. Signing in on a new device uses that same passkey. Keep a copy of your wallet address somewhere outside the app — recovery is fastest when you have it.',
  },
  {
    q: 'What does it cost?',
    a: 'Nothing to open, and network fees are sponsored, so a transfer costs you zero. Stellar itself charges a fraction of a cent, which Veil covers. Where a third party is involved — a swap venue, an anchor — their fee is shown before you sign, never after.',
  },
  {
    q: 'Where does the yield come from?',
    a: 'From Blend, a lending pool on Stellar: your USDC is borrowed by others who post collateral, and they pay interest. It is not a Veil product and not a guaranteed rate. It is DeFi, the rate moves, and pools carry smart-contract risk. Nothing is deposited unless you approve it with your passkey.',
  },
  {
    q: 'Is this actually live, or a prototype?',
    a: 'Live on Stellar mainnet. The contracts are deployed and source-verified, and the core flows have real transactions behind them — a passkey-authorised spend and a live DEX swap among them. Bills and airtime are the exception: those need a licensed naira partner and are not switched on yet.',
  },
]

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold">{children}</span>
  )
}

export function Capabilities() {
  return (
    <section id="capabilities" className="bg-near-black section-pad">
      <div className="max-w-[1240px] mx-auto px-6 lg:px-10">
        <SectionLabel>Everything it does</SectionLabel>
        <h2 className="font-lora italic font-semibold text-off-white text-display-sm mt-3 max-w-[620px]">
          One balance. Every way you actually use money.
        </h2>

        <div className="grid grid-cols-4 max-lg:grid-cols-2 max-sm:grid-cols-1 gap-4 mt-12">
          {CAPABILITIES.map((c) => (
            <div
              key={c.name}
              className="bg-white/[0.03] border border-white/10 rounded-[22px] p-6 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-inter font-semibold text-off-white text-[15px]">{c.name}</h3>
                {/* An untagged grid would read as "all of this works today". */}
                <span
                  className={`font-mono text-[9px] uppercase tracking-[0.1em] rounded-pill px-2 py-[3px] whitespace-nowrap ${
                    c.live
                      ? 'text-teal bg-teal/10 border border-teal/25'
                      : 'text-off-white/45 bg-white/[0.04] border border-white/10'
                  }`}
                >
                  {c.live ? 'Live' : 'Coming'}
                </span>
              </div>
              <p className="font-inter text-[13.5px] leading-[1.65] text-off-white/55">{c.blurb}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function Trust() {
  return (
    <section id="security" className="bg-off-white section-pad">
      <div className="max-w-[1240px] mx-auto px-6 lg:px-10">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-near-black/50">
          Security
        </span>
        <h2 className="font-lora italic font-semibold text-near-black text-display-sm mt-3 max-w-[640px]">
          You should not have to trust us. So we built it so you don&rsquo;t have to.
        </h2>

        <div className="grid grid-cols-2 max-md:grid-cols-1 gap-x-14 gap-y-10 mt-12">
          {TRUST.map((t) => (
            <div key={t.title} className="flex flex-col gap-3">
              <h3 className="font-inter font-semibold text-near-black text-[17px]">{t.title}</h3>
              <p className="font-inter text-[14.5px] leading-[1.75] text-near-black/65">{t.body}</p>
            </div>
          ))}
        </div>

        <a
          href="https://docs.useveilapp.xyz/threat-model"
          className="inline-flex items-center gap-2 mt-11 font-inter font-semibold text-[14px] text-near-black border-b-2 border-gold pb-1 transition-opacity hover:opacity-70"
        >
          Read the threat model
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    </section>
  )
}

export function Faq() {
  return (
    <section id="faq" className="bg-near-black section-pad">
      <div className="max-w-[880px] mx-auto px-6 lg:px-10">
        <SectionLabel>Questions</SectionLabel>
        <h2 className="font-lora italic font-semibold text-off-white text-display-sm mt-3">
          The things people ask first.
        </h2>

        <div className="mt-11 border-t border-white/10">
          {FAQ.map((item) => (
            <details key={item.q} className="group border-b border-white/10 py-6">
              <summary className="flex items-center justify-between gap-6 cursor-pointer list-none">
                <h3 className="font-inter font-semibold text-off-white text-[17px]">{item.q}</h3>
                <span
                  aria-hidden="true"
                  className="text-gold text-[20px] leading-none shrink-0 transition-transform duration-200 ease-stellar group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="font-inter text-[15px] leading-[1.8] text-off-white/60 mt-4 max-w-[720px]">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
