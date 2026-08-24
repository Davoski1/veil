import { BASE_FEE } from '@stellar/stellar-sdk'

import { getNetwork } from './network'

/**
 * Inclusion-fee bid (stroops, per operation) for building transactions.
 *
 * Mainnet surge-prices inclusion — the Soroban lane especially — and the
 * 100-stroop BASE_FEE gets rejected outright with txINSUFFICIENT_FEE. The
 * mobile app hit this on the factory deploy and again on its first in-app SAC
 * transfer; the web wallet had the same 100-stroop bid at every build site,
 * so it would have failed the same way the moment anyone switched to mainnet.
 *
 * Overbidding is safe on Stellar: the ledger charges the effective market
 * rate, not the bid, so a generous mainnet bid (0.1 XLM) costs approximately
 * nothing in practice while surviving surges. Testnet keeps the minimum.
 */
export function inclusionFee(): string {
  return getNetwork().name === 'mainnet' ? '1000000' : BASE_FEE
}
