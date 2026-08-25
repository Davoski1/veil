/**
 * Landing hero — the Talise-style arrangement in Veil's brand.
 *
 * The device is drawn in CSS rather than screenshotted, so it stays sharp at
 * any density, themes with the page, and does not go stale the next time the
 * wallet UI changes.
 *
 * The numbers inside the phone are illustrative product art, which is normal
 * for a marketing shot. The three stated metrics below the CTAs are NOT — those
 * are claims a reader will hold us to, so each one is true today:
 * fees really are sponsored, there really is no seed phrase, and Stellar really
 * settles in about five seconds. The design's "6.2% APY" is deliberately absent:
 * a yield figure is a financial claim, it moves with the Blend pool, and we have
 * no live position to quote.
 */
import Link from 'next/link'

const METRICS: { value: string; label: string }[] = [
  { value: '0', label: 'Seed phrases' },
  { value: '₦0', label: 'Network fees' },
  { value: '~5s', label: 'Settlement' },
]

/** The drape mark, matching the wallet's `VeilMark`. */
function Mark({ size = 26, color = '#FDDA24' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" role="img" aria-label="Veil">
      <rect x="22" y="26" width="52" height="12" rx="6" fill={color} />
      <rect x="28" y="44" width="40" height="12" rx="6" fill={color} opacity="0.5" />
      <rect x="34" y="62" width="28" height="12" rx="6" fill={color} opacity="0.22" />
    </svg>
  )
}

const PAY_FOR: { name: string; sub: string }[] = [
  { name: 'Airtime', sub: 'All networks' },
  { name: 'Data', sub: 'Bundles' },
  { name: 'Power', sub: 'Prepaid' },
  { name: 'TV', sub: 'DStv · GOtv' },
  { name: 'Bills', sub: 'Water · waste' },
  { name: 'Transfer', sub: 'To any bank' },
  { name: 'Betting', sub: 'Top up' },
  { name: 'More', sub: 'All services' },
]

/** The in-app screen, drawn in CSS. Decorative — hidden from screen readers. */
function PhoneScreen() {
  return (
    <div className="flex flex-col gap-[10px] p-[14px] h-full">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-[6px]">
          <Mark size={14} />
          <span className="font-anton text-gold text-[11px] tracking-[0.08em]">VEIL</span>
        </span>
        <span className="font-mono text-[8px] text-gold/70 border border-gold/25 rounded-pill px-[7px] py-[2px]">
          GDKF…9QX3
        </span>
      </div>

      {/* Metallic balance plate — the same gradient the wallet ships. */}
      <div
        className="relative overflow-hidden rounded-[14px] p-[13px] text-near-black"
        style={{
          background:
            'linear-gradient(135deg,#3a3d42 0%,#8f959c 22%,#e8ebee 38%,#9aa0a7 52%,#5c6066 70%,#caced3 88%,#75797f 100%)',
          boxShadow: '0 10px 22px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.5)',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(105deg,transparent 38%,rgba(255,255,255,0.5) 46%,transparent 55%)' }}
        />
        <div className="relative flex items-start justify-between">
          <span className="text-[7px] font-bold tracking-[0.14em] uppercase text-near-black/55">
            Total balance
          </span>
          <Mark size={13} color="#0F0F0F" />
        </div>
        <div className="relative font-lora italic font-semibold text-[26px] leading-none mt-[7px]">
          ₦642,384
          <span className="text-[15px]">.10</span>
        </div>
        <div className="relative flex items-center justify-between mt-[9px] gap-2">
          <span className="font-mono text-[8px] text-near-black/60 whitespace-nowrap">
            412.98 USDC
          </span>
          <span className="bg-near-black/85 text-[#00e0f0] rounded-pill px-[7px] py-[2px] text-[8px] font-semibold whitespace-nowrap">
            +₦109.32 today
          </span>
        </div>
        <div className="relative flex gap-[7px] mt-[11px]">
          <span className="flex-1 bg-near-black text-off-white rounded-pill py-[6px] text-center text-[9px] font-semibold">
            ↗ Send
          </span>
          <span className="flex-1 bg-near-black/10 border border-near-black/20 rounded-pill py-[6px] text-center text-[9px] font-semibold">
            ↙ Receive
          </span>
        </div>
      </div>

      <div className="bg-white/[0.03] border border-white/10 rounded-[12px] p-[11px]">
        <div className="text-[7px] font-bold tracking-[0.14em] uppercase text-gold">Pay for</div>
        <div className="grid grid-cols-4 gap-x-[6px] gap-y-[9px] mt-[8px]">
          {PAY_FOR.map((s) => (
            <div key={s.name} className="flex flex-col gap-[1px] min-w-0">
              <span className="text-[8px] font-semibold text-off-white whitespace-nowrap">{s.name}</span>
              <span className="text-[6px] text-off-white/40 whitespace-nowrap truncate">{s.sub}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white/[0.03] border border-white/10 rounded-[12px] p-[11px] flex-1">
        <div className="flex items-baseline justify-between">
          <span className="text-[7px] font-bold tracking-[0.14em] uppercase text-gold">Activity</span>
          <span className="text-[7px] text-off-white/40">See all</span>
        </div>
        {[
          { label: 'MTN Airtime', sub: '0803 123 4567 · 2h', amount: '−₦2,000', teal: false },
          { label: 'Yield earned', sub: 'Blend USDC pool · today', amount: '+₦109.32', teal: true },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between mt-[9px] gap-2">
            <span className="flex flex-col gap-[1px] min-w-0">
              <span className="text-[8px] font-medium text-off-white whitespace-nowrap">{row.label}</span>
              <span className="font-mono text-[6px] text-off-white/45 whitespace-nowrap">{row.sub}</span>
            </span>
            <span
              className={`font-mono text-[8px] font-semibold whitespace-nowrap ${row.teal ? 'text-teal' : 'text-off-white'}`}
            >
              {row.amount}
            </span>
          </div>
        ))}
      </div>

      <div className="relative flex items-center justify-between bg-white/[0.04] border border-white/10 rounded-pill px-[14px] py-[7px]">
        {['Home', 'Earn', '', 'Agent', 'Settings'].map((tab, i) =>
          tab ? (
            <span
              key={tab}
              className={`text-[7px] ${i === 0 ? 'text-gold' : 'text-off-white/45'}`}
            >
              {tab}
            </span>
          ) : (
            <span key="fab" className="w-[7px]" />
          ),
        )}
        <span className="absolute left-1/2 -translate-x-1/2 -top-[11px] w-[28px] h-[28px] rounded-full bg-gold text-near-black flex items-center justify-center text-[15px] font-semibold shadow-[0_5px_14px_rgba(253,218,36,0.35)]">
          +
        </span>
      </div>
    </div>
  )
}

function Phone({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-[40px] border border-white/20 bg-[#0A0A0A] p-[8px] shadow-[0_60px_120px_rgba(0,0,0,0.8)] ${className}`}
    >
      <div className="relative w-[286px] h-[600px] rounded-[32px] bg-near-black overflow-hidden">
        {/* Notch */}
        <div className="absolute top-[7px] left-1/2 -translate-x-1/2 w-[70px] h-[16px] rounded-pill bg-black z-10" />
        <PhoneScreen />
      </div>
    </div>
  )
}

export function LandingHero() {
  return (
    <section className="relative bg-near-black overflow-hidden">
      {/* Warm falloff behind the devices, so they sit in light rather than on a flat field. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(60% 55% at 78% 42%, rgba(253,218,36,0.20) 0%, rgba(253,218,36,0.06) 40%, transparent 72%)',
        }}
      />

      <div className="relative max-w-[1240px] mx-auto px-6 lg:px-10 py-20 lg:py-28 flex items-center gap-16 max-lg:flex-col max-lg:text-left">
        <div className="flex-1 min-w-0 max-w-[560px]">
          <span className="flex items-center gap-[11px]">
            <Mark size={24} />
            <span className="font-anton text-gold text-[20px] tracking-[0.08em]">VEIL</span>
          </span>

          <h1 className="font-anton uppercase text-off-white mt-9 text-[clamp(2.6rem,5.4vw,4.1rem)] leading-[1.02] tracking-[-0.01em]">
            Spend anywhere.
            <br />
            Earn dollars.
            <br />
            <span className="text-gold">No keys.</span>
          </h1>

          <p className="font-inter text-[17px] leading-[1.75] text-off-white/60 mt-7 max-w-[470px]">
            Hold dollars, spend in naira. The balance earns yield underneath, and
            nothing moves without your passkey — face, fingerprint, your device,
            your call.
          </p>

          <div className="flex flex-wrap gap-3 mt-9">
            <Link
              href="https://app.useveilapp.xyz"
              className="bg-gold text-near-black font-semibold text-[15px] rounded-pill px-7 py-[14px] transition-transform duration-200 ease-stellar hover:-translate-y-[1px]"
            >
              Create wallet
            </Link>
            <Link
              href="https://docs.useveilapp.xyz"
              className="border border-white/15 bg-white/[0.04] text-off-white font-semibold text-[15px] rounded-pill px-7 py-[14px] transition-colors duration-200 hover:border-white/30"
            >
              Read the docs
            </Link>
          </div>

          <div className="h-px bg-white/10 mt-12" />

          <dl className="flex gap-12 mt-7 flex-wrap">
            {METRICS.map((m) => (
              <div key={m.label} className="flex flex-col gap-[6px]">
                <dt className="sr-only">{m.label}</dt>
                <dd className="font-lora italic font-semibold text-[30px] leading-none text-off-white">
                  {m.value}
                </dd>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-off-white/45 whitespace-nowrap">
                  {m.label}
                </span>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative shrink-0 flex items-center justify-center max-lg:mt-4">
          {/* Back device: depth only, so it stays mostly behind the front one. */}
          <div className="absolute right-[-56px] top-[30px] rotate-[8deg] opacity-75 max-md:hidden">
            <div className="rounded-[40px] border border-white/10 bg-[#0A0A0A] w-[300px] h-[614px] shadow-[0_40px_90px_rgba(0,0,0,0.75)] flex flex-col items-center justify-center gap-4">
              <Mark size={44} />
              <span className="font-anton text-gold text-[22px] tracking-[0.08em]">VEIL</span>
            </div>
          </div>
          <Phone className="relative -rotate-[3deg]" />
        </div>
      </div>
    </section>
  )
}
