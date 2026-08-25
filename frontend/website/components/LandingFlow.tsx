/**
 * Flow showcase — three devices telling one story: Amount, Review & sign, Sent.
 *
 * Borrowed arrangement from Talise's landing, because it matches a rule we had
 * already set in PRODUCT_VISION.md: every money action is a *flow*, not a
 * screen. A static feature grid cannot show that; three phones in sequence can.
 *
 * The devices are deliberately large and heavily overlapped. A tasteful, small
 * mock reads as a diagram; the point of this section is that it reads as a
 * product. Gold takes the role Talise's green plays — a glow behind the centre
 * device so the dark phones sit in light rather than float on a flat field.
 *
 * All CSS: stays sharp at any density and does not go stale when the app UI
 * changes.
 */

function Mark({ size = 14, color = '#FDDA24' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden="true">
      <rect x="22" y="26" width="52" height="12" rx="6" fill={color} />
      <rect x="28" y="44" width="40" height="12" rx="6" fill={color} opacity="0.5" />
      <rect x="34" y="62" width="28" height="12" rx="6" fill={color} opacity="0.22" />
    </svg>
  )
}

function Shell({
  children,
  className = '',
  front,
}: {
  children: React.ReactNode
  className?: string
  front?: boolean
}) {
  return (
    <div
      aria-hidden="true"
      className={`shrink-0 rounded-[42px] border bg-[#0A0A0A] p-[8px] ${
        front
          ? 'border-white/25 shadow-[0_60px_120px_rgba(0,0,0,0.55)] z-20'
          : 'border-white/12 shadow-[0_38px_80px_rgba(0,0,0,0.4)] z-10'
      } ${className}`}
    >
      <div
        className={`relative rounded-[35px] bg-near-black overflow-hidden ${
          front ? 'w-[300px] h-[608px]' : 'w-[272px] h-[552px]'
        }`}
      >
        <div className="absolute top-[9px] left-1/2 -translate-x-1/2 w-[86px] h-[19px] rounded-pill bg-black z-10" />
        <div className="flex flex-col h-full pt-[38px] px-[18px] pb-[18px]">{children}</div>
      </div>
    </div>
  )
}

function StepHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-[9px]">
      <span className="text-off-white/40 text-[16px] leading-none">‹</span>
      <span className="font-inter font-semibold text-off-white text-[15px]">{title}</span>
    </div>
  )
}

/** 1 — Amount. */
function AmountPhone() {
  return (
    <Shell className="rotate-[-8deg] translate-y-[40px] mr-[-58px] max-xl:hidden">
      <StepHeader title="Send" />
      <div className="flex-1 flex flex-col items-center justify-center gap-[10px]">
        <span className="font-lora italic font-semibold text-off-white text-[52px] leading-none whitespace-nowrap">
          ₦25,000
        </span>
        <span className="font-mono text-[12px] text-off-white/45">≈ 16.08 USDC</span>
      </div>
      <div className="flex gap-[7px]">
        {['25%', '50%', '75%'].map((c) => (
          <span
            key={c}
            className="flex-1 text-center font-mono text-[11px] text-off-white/60 border border-white/10 bg-white/[0.04] rounded-pill py-[9px]"
          >
            {c}
          </span>
        ))}
      </div>
      <span className="mt-[14px] bg-white/[0.06] border border-white/10 text-off-white/70 rounded-pill py-[14px] text-center text-[14px] font-semibold">
        Review
      </span>
    </Shell>
  )
}

/** 2 — Review and sign. The moment the product is actually about. */
function ReviewPhone() {
  return (
    <Shell front>
      <StepHeader title="Review send" />

      <div className="bg-white/[0.04] border border-white/10 rounded-[20px] p-[18px] mt-[22px]">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-off-white/40">
          From your balance
        </span>
        <div className="font-lora italic font-semibold text-off-white text-[40px] leading-none mt-[10px]">
          ₦25,000
        </div>
        <div className="font-mono text-[11px] text-off-white/45 mt-[8px]">16.08 USDC</div>
      </div>

      <div className="flex justify-center py-[12px]">
        <span className="w-[30px] h-[30px] rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-off-white/50 text-[14px]">
          ↓
        </span>
      </div>

      <div className="bg-white/[0.04] border border-white/10 rounded-[20px] p-[18px]">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-off-white/40">To</span>
        <div className="font-inter font-semibold text-off-white text-[18px] mt-[8px]">Adaeze</div>
        <div className="font-mono text-[11px] text-off-white/45 mt-[5px]">GDKF…9QX3</div>
      </div>

      <div className="flex items-center justify-center gap-[7px] mt-[20px]">
        <span className="text-teal text-[12px]">✓</span>
        <span className="font-mono text-[11px] text-off-white/55 text-center">
          No network fee — sponsored by Veil
        </span>
      </div>

      <div className="flex-1" />

      {/* Slide-to-sign: the passkey is the confirmation, not a password. */}
      <div className="relative bg-white/[0.05] border border-white/10 rounded-pill h-[56px] flex items-center justify-center">
        <span className="font-inter font-semibold text-off-white text-[15px]">Slide to sign</span>
        <span className="absolute left-[4px] w-[48px] h-[48px] rounded-full bg-gold text-near-black flex items-center justify-center text-[19px] font-bold shadow-[0_6px_20px_rgba(253,218,36,0.45)]">
          »
        </span>
      </div>
    </Shell>
  )
}

/** 3 — Sent. */
function SuccessPhone() {
  return (
    <Shell className="rotate-[8deg] translate-y-[40px] ml-[-58px] max-xl:hidden">
      <div className="flex-1 flex flex-col items-center justify-center gap-[14px] text-center">
        <span className="w-[62px] h-[62px] rounded-full bg-teal/15 border border-teal/35 flex items-center justify-center text-teal text-[28px]">
          ✓
        </span>
        <span className="font-lora italic font-semibold text-off-white text-[44px] leading-none whitespace-nowrap">
          ₦25,000
        </span>
        <span className="font-inter font-semibold text-off-white text-[16px]">Sent to Adaeze</span>
        <span className="font-mono text-[11px] text-off-white/45 leading-[1.8]">
          Fee ₦0 · settled in 5s
          <br />
          Signed with your passkey
        </span>
      </div>
      <div className="flex gap-[8px]">
        <span className="flex-1 border border-white/10 bg-white/[0.05] text-off-white/70 rounded-pill py-[13px] text-center text-[13px] font-semibold">
          Receipt
        </span>
        <span className="flex-1 bg-gold text-near-black rounded-pill py-[13px] text-center text-[13px] font-semibold">
          Done
        </span>
      </div>
      <div className="flex items-center justify-center gap-[7px] mt-[14px]">
        <Mark size={14} />
        <span className="font-anton text-gold text-[11px] tracking-[0.08em]">VEIL</span>
      </div>
    </Shell>
  )
}

/** Corner crop marks — the design-tool cue that makes the field feel composed. */
function CropMarks() {
  const base = 'absolute w-[18px] h-[18px] border-near-black/25'
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-8 max-md:hidden">
      <span className={`${base} left-0 top-0 border-l border-t`} />
      <span className={`${base} right-0 top-0 border-r border-t`} />
      <span className={`${base} left-0 bottom-0 border-l border-b`} />
      <span className={`${base} right-0 bottom-0 border-r border-b`} />
    </div>
  )
}

export function FlowShowcase() {
  return (
    <section id="how-sending-works" className="relative overflow-hidden bg-warm-grey py-28 max-lg:py-20">
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          backgroundImage: 'radial-gradient(rgba(15,15,15,0.18) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      <CropMarks />

      <div className="relative max-w-[1240px] mx-auto px-6 lg:px-10">
        <div className="max-w-[640px]">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-near-black/50">
            Sending money
          </span>
          <h2 className="font-lora italic font-semibold text-near-black text-display mt-3 max-lg:text-display-sm">
            Three taps. No fee.
            <br />
            No seed phrase.
          </h2>
          <p className="font-inter text-[17px] leading-[1.75] text-near-black/65 mt-6">
            Every money action is a flow with a review step and a real outcome — never
            a form that swallows your money and hopes. You approve the exact amount and
            recipient with your face or fingerprint, and Veil covers the network fee.
          </p>
        </div>
      </div>

      <div className="relative mt-20 max-lg:mt-14 flex items-center justify-center">
        {/* Gold falloff behind the centre device — Veil's answer to Talise's green field. */}
        <div
          aria-hidden="true"
          className="absolute w-[760px] h-[760px] rounded-full pointer-events-none max-md:w-[440px] max-md:h-[440px]"
          style={{
            background:
              'radial-gradient(circle, rgba(253,218,36,0.30) 0%, rgba(253,218,36,0.10) 42%, transparent 68%)',
          }}
        />
        <AmountPhone />
        <ReviewPhone />
        <SuccessPhone />
      </div>
    </section>
  )
}
