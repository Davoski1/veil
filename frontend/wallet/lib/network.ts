import { Asset, Networks } from '@stellar/stellar-sdk'
import type { WalletConfig } from '@veil/sdk'

export type VeilNetworkName = 'testnet' | 'mainnet'

export type VeilNetwork = {
  name: VeilNetworkName
  displayName: string
  networkPassphrase: string
  horizonUrl: string
  rpcUrl: string
  factoryContractId: string
  friendbotUrl: string | null
}

/** localStorage key holding the user's chosen network. Mirrors `veil_theme`. */
export const NETWORK_STORAGE_KEY = 'veil_network'

/**
 * Build-time default. This used to be the *only* source of the active network,
 * which meant a deployed site was frozen to whichever value it was built with —
 * the live wallet could not reach mainnet without a rebuild. It is now just the
 * fallback for the first visit (and for SSR, where localStorage does not exist).
 */
function envDefaultNetwork(): VeilNetworkName {
  return process.env.NEXT_PUBLIC_NETWORK === 'mainnet' ? 'mainnet' : 'testnet'
}

function readStoredNetwork(): VeilNetworkName | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = window.localStorage.getItem(NETWORK_STORAGE_KEY)
    return stored === 'mainnet' || stored === 'testnet' ? stored : null
  } catch {
    // Private mode / blocked storage — fall back to the build-time default.
    return null
  }
}

/**
 * Mainnet Soroban RPC is a paid, keyed endpoint. Putting that URL in a
 * `NEXT_PUBLIC_` variable would bake the provider key into the client bundle,
 * where anyone loading the site can read it and burn the quota. So the default
 * is a same-origin proxy (`app/api/rpc/mainnet`) that keeps the key server-side.
 * An explicit `NEXT_PUBLIC_MAINNET_RPC_URL` still wins for local development
 * against an unkeyed or self-hosted RPC.
 */
function resolveMainnetRpcUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_MAINNET_RPC_URL?.trim()
  if (explicit) return explicit
  if (typeof window !== 'undefined') return `${window.location.origin}/api/rpc/mainnet`
  return ''
}

export const NETWORKS: Record<VeilNetworkName, VeilNetwork> = {
  testnet: {
    name: 'testnet',
    displayName: 'Stellar Testnet',
    networkPassphrase: Networks.TESTNET,
    horizonUrl: process.env.NEXT_PUBLIC_HORIZON_URL?.trim() || 'https://horizon-testnet.stellar.org',
    rpcUrl:
      process.env.NEXT_PUBLIC_SOROBAN_RPC_URL?.trim()
      || process.env.NEXT_PUBLIC_RPC_URL?.trim()
      || 'https://soroban-testnet.stellar.org',
    factoryContractId:
      process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ID_TESTNET?.trim()
      || process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ID?.trim()
      // Deployed testnet passkey-wallet factory. Committed so a fresh clone
      // runs without secret config; override per-deployment via env.
      || 'CAUK4MWO3TTFM6PLURSH2GPK3AB747SZGABKTCVLKCU7W2MGKHKP35GA',
    friendbotUrl: 'https://friendbot.stellar.org',
  },
  mainnet: {
    name: 'mainnet',
    displayName: 'Stellar Mainnet',
    networkPassphrase: Networks.PUBLIC,
    horizonUrl: 'https://horizon.stellar.org',
    rpcUrl: resolveMainnetRpcUrl(),
    factoryContractId:
      process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ID_MAINNET?.trim()
      // Deployed 2026-08-21; its own bytecode and the wallet WASM it deploys
      // (b485f817…) match contracts/expected-hashes.json — verified on-chain.
      || 'CCZ3JLRESNLDADGXWNEH4YQ4NXUUAHRJNCWZHYG6QB4KTDYHOH6OQ7BK',
    friendbotUrl: null,
  },
}

/**
 * Resolved once per page load, deliberately. `setActiveNetwork` reloads the
 * page, so every module that captured a value derived from this — including the
 * `walletConfig` const below, and the SDK client built from it — is rebuilt
 * from scratch on the new network. Swapping the network in place instead would
 * leave stale RPC clients, cached balances and in-flight requests pointing at
 * the old chain, which is exactly how a testnet balance ends up displayed over
 * a mainnet account.
 */
const activeNetworkName: VeilNetworkName = readStoredNetwork() ?? envDefaultNetwork()

export function getNetwork(): VeilNetwork {
  return NETWORKS[activeNetworkName]
}

export function getNetworkName(): VeilNetworkName {
  return activeNetworkName
}

/** True when this build/deploy can actually talk to the given network. */
export function isNetworkAvailable(name: VeilNetworkName): boolean {
  if (name === 'testnet') return true
  return NETWORKS.mainnet.rpcUrl.length > 0
}

/**
 * Switch networks and reload. Returns false when the switch was refused
 * (unknown name, or the target network has no reachable RPC).
 */
export function setActiveNetwork(name: VeilNetworkName): boolean {
  if (typeof window === 'undefined') return false
  if (name !== 'testnet' && name !== 'mainnet') return false
  if (!isNetworkAvailable(name)) return false
  if (name === activeNetworkName) return true
  try {
    window.localStorage.setItem(NETWORK_STORAGE_KEY, name)
  } catch {
    return false
  }

  // The wallet's contract address is derived from the factory that deployed
  // it, and each network has its own factory — so the same passkey resolves
  // to a DIFFERENT C-address per network. The session address must therefore
  // be dropped on a switch; keeping it would leave the wallet displaying the
  // old network's address while querying the new chain, which reads as an
  // empty account and invites a send to an address that does not exist here.
  //
  // Removing it sends the dashboard to /lock, where wallet.login() re-derives
  // the address against the new factory. It is removed rather than compared
  // because /lock treats a stored address that differs from the derived one
  // as tampering ("Account mismatch"), which is the wrong verdict when the
  // user simply changed networks. The fee-payer key is left alone: a Stellar
  // keypair is the same G-address on every network.
  try {
    window.sessionStorage.removeItem('invisible_wallet_address')
  } catch {
    // Session storage unavailable; the reload below still applies the switch.
  }

  window.location.reload()
  return true
}

export const walletConfig: WalletConfig = {
  factoryAddress: getNetwork().factoryContractId,
  rpcUrl: getNetwork().rpcUrl,
  networkPassphrase: getNetwork().networkPassphrase,
}

export function getNativeAssetContractId(): string {
  return Asset.native().contractId(getNetwork().networkPassphrase)
}

export function buildFriendbotUrl(address: string): string | null {
  const friendbotUrl = getNetwork().friendbotUrl
  if (!friendbotUrl) return null

  const url = new URL(friendbotUrl)
  url.searchParams.set('addr', address)
  return url.toString()
}

/**
 * True when mainnet traffic goes through the same-origin proxy rather than an
 * explicit public URL. The proxy only works if the *server* has MAINNET_RPC_URL
 * set, which the browser cannot know without asking — see `NetworkSwitcher`.
 */
export function mainnetUsesProxy(): boolean {
  return !process.env.NEXT_PUBLIC_MAINNET_RPC_URL?.trim()
}

/**
 * Canonical USDC issuer for the active network.
 *
 * These are different assets: mainnet USDC is Circle's, testnet USDC is the
 * SDF test anchor's. Hardcoding either one made the wallet wrong on the other
 * network — the swap screen defaulted its destination to the testnet issuer
 * (so on mainnet it pointed at an asset that is not USDC there), while the
 * price lookup asked for the mainnet issuer (so on testnet the pair did not
 * exist and every price came back null).
 */
export function getUsdcIssuer(): string {
  return getNetwork().name === 'mainnet'
    ? 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'
    : 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'
}
