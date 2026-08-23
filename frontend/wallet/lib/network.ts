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
    // No public default: mainnet Soroban RPC is a paid/keyed endpoint, so the
    // URL (which carries the key) must come from the environment.
    rpcUrl: process.env.NEXT_PUBLIC_MAINNET_RPC_URL?.trim() || '',
    factoryContractId:
      process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ID_MAINNET?.trim()
      // Deployed 2026-08-21; its own bytecode and the wallet WASM it deploys
      // (b485f817…) match contracts/expected-hashes.json — verified on-chain.
      || 'CCZ3JLRESNLDADGXWNEH4YQ4NXUUAHRJNCWZHYG6QB4KTDYHOH6OQ7BK',
    friendbotUrl: null,
  },
}

export function getNetwork(): VeilNetwork {
  return process.env.NEXT_PUBLIC_NETWORK === 'mainnet'
    ? NETWORKS.mainnet
    : NETWORKS.testnet
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
