'use client'

import { useActivityFeed } from '@/lib/activityFeed'
import { PageHeader } from '@/components/ui/primitives'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Keypair } from '@stellar/stellar-sdk'
import { QRCodeCanvas } from 'qrcode.react'
import { buildSep7PayUri } from '@/lib/sep7'
import { walletLocal, walletSession } from '@/lib/walletStorage'

function shorten(address: string, head = 12, tail = 12): string {
  return address.length > head + tail + 1
    ? `${address.slice(0, head)}…${address.slice(-tail)}`
    : address
}

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}

function CopyIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2"/>
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function HexagonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2l8 4.5v11L12 22l-8-4.5v-11L12 2z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"/>
    </svg>
  )
}

function Tile({
  label,
  onClick,
  disabled,
  icon,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  icon: ReactNode
}) {
  return (
    <button type="button" className="vw-recv-tile" onClick={onClick} disabled={disabled}>
      {icon}
      {label}
    </button>
  )
}

function SpendingCard({ address }: { address: string }) {
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)
  const payUri = buildSep7PayUri({ destination: address })

  const handleCopy = async () => {
    if (!(await copyText(address))) return
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveQr = () => {
    if (!qrRef.current) return
    setDownloading(true)
    const canvas = qrRef.current.querySelector('canvas')
    if (!canvas) { setDownloading(false); return }

    const pad = 24
    const out = document.createElement('canvas')
    out.width = canvas.width + pad * 2
    out.height = canvas.height + pad * 2
    const ctx = out.getContext('2d')
    if (!ctx) { setDownloading(false); return }
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, out.width, out.height)
    ctx.drawImage(canvas, pad, pad)

    const link = document.createElement('a')
    link.download = `veil-spending-${address.slice(0, 8)}.png`
    link.href = out.toDataURL('image/png')
    link.click()
    setDownloading(false)
  }

  const handleShare = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'My Veil Wallet Address', text: address })
      } catch { /* user dismissed */ }
      return
    }
    await handleCopy()
  }

  return (
    <div className="vw-spendcard">
      <p className="vw-spendcard__label">Spending address</p>
      <p className="vw-spendcard__sub">Use this for most senders &amp; exchanges</p>

      <div ref={qrRef} className="vw-qrframe">
        <QRCodeCanvas
          value={payUri}
          size={200}
          bgColor="#ffffff"
          fgColor="#0F0F0F"
          level="M"
        />
      </div>

      <p className="vw-spendcard__addr">{address}</p>

      <div className="vw-recv-tiles">
        <Tile label={copied ? 'Copied' : 'Copy'} onClick={handleCopy} icon={<CopyIcon />} />
        <Tile label={downloading ? 'Saving…' : 'Save QR'} onClick={handleSaveQr} disabled={downloading} icon={<DownloadIcon />} />
        <Tile label="Share" onClick={handleShare} icon={<ShareIcon />} />
      </div>
    </div>
  )
}

function ContractRow({ address }: { address: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!(await copyText(address))) return
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      className="vw-contract-row"
      onClick={handleCopy}
      aria-label="Copy contract address"
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <span className="vw-contract-row__badge"><HexagonIcon /></span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>Contract address</span>
          <span className="vw-meta" style={{ display: 'block', marginTop: 1 }}>
            {copied ? 'Copied' : `${shorten(address, 6, 6)} · Soroban wallets only`}
          </span>
        </span>
      </span>
      <span className="vw-contract-row__copy" aria-hidden="true"><CopyIcon /></span>
    </button>
  )
}

export default function ReceivePage() {
  const router = useRouter()
  const [contractAddress, setContractAddress] = useState<string | null>(null)
  const [feePayerAddress, setFeePayerAddress] = useState<string | null>(null)

  const deposits = useActivityFeed().filter((t) => t.type === 'received').slice(0, 4)

  useEffect(() => {
    const stored = walletSession.getItem('invisible_wallet_address')
    if (!stored) { router.replace('/lock'); return }
    setContractAddress(stored)

    const signerSecret = walletSession.getItem('veil_signer_secret')
      || walletLocal.getItem('veil_signer_secret')
    if (signerSecret) {
      try {
        setFeePayerAddress(Keypair.fromSecret(signerSecret).publicKey())
      } catch { /* malformed secret */ }
      return
    }
    const storedPub = walletLocal.getItem('veil_signer_public_key')
    if (storedPub) setFeePayerAddress(storedPub)
  }, [router])

  const ready = !!contractAddress

  return (
    <div className="wallet-shell">
      <header className="wallet-nav">
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--off-white)', display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>
        <span style={{
          fontFamily: 'Anton, Impact, sans-serif',
          fontSize: '1.25rem', letterSpacing: '0.08em',
          color: 'var(--gold)', userSelect: 'none',
        }}>
          VEIL
        </span>
      </header>

      <main className="wallet-main wallet-main--wide" style={{ paddingTop: '3rem', paddingBottom: '3rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <PageHeader eyebrow="Deposit" title="Receive" />
          <p style={{ fontSize: '0.875rem', color: 'rgba(246,247,248,0.5)', marginTop: '0.5rem' }}>
            Share the spending address with most senders. The contract address is for Soroban wallets only.
          </p>
        </div>

        {!ready ? (
          <div className="spinner spinner-light" style={{ width: '2rem', height: '2rem', margin: '4rem auto' }} />
        ) : (
          <div className="vw-row vw-row--first" style={{ alignItems: 'flex-start' }}>
            <div className="vw-receivecol">
              {feePayerAddress ? (
                <SpendingCard address={feePayerAddress} />
              ) : (
                <div className="vw-spendcard" style={{ alignItems: 'flex-start' }}>
                  <p style={{ fontSize: '0.8125rem', color: 'rgba(246,247,248,0.55)', lineHeight: 1.5 }}>
                    Your spending address (G…) will appear here after you tap <strong style={{ color: 'var(--off-white)' }}>Fund wallet</strong> on the dashboard.
                  </p>
                </div>
              )}

              {contractAddress && <ContractRow address={contractAddress} />}
            </div>

            <div className="vw-swapside">
              <div className="vw-panel" style={{ padding: '8px 26px 16px' }}>
                <div className="vw-label" style={{ padding: '18px 0 4px' }}>Recent deposits</div>
                {deposits.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'rgba(246,247,248,0.4)', padding: '12px 0' }}>
                    Nothing received yet.
                  </p>
                ) : deposits.map((tx) => (
                  <div key={tx.id} className="vw-listrow" style={{ padding: '14px 0', cursor: 'default' }}>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                      <span style={{ fontSize: '14px', fontWeight: 500 }}>Received</span>
                      <span className="vw-meta">
                        {tx.counterparty.length > 14
                          ? `${tx.counterparty.slice(0, 6)}…${tx.counterparty.slice(-6)}`
                          : tx.counterparty}
                      </span>
                    </span>
                    <span className="font-mono" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--teal)', flexShrink: 0 }}>
                      +{tx.amount} {tx.asset}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
