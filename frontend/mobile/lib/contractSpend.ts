/**
 * Spending the smart wallet's OWN funds — the `__check_auth` path.
 *
 * A transfer out of the C-address is a native-SAC `transfer(from=C, to, amount)`
 * whose address credential must be authorised by the wallet contract itself:
 * the passkey signs the Soroban authorization preimage and `__check_auth`
 * verifies that WebAuthn signature on-chain. `signXdrPayload` (lib/walletConnect)
 * already implements the whole ceremony — recording-mode simulate, passkey-sign
 * each auth entry, enforce-mode re-simulate, fee-payer wrap — so this module
 * just builds the unsigned transfer and routes it through.
 */

import {
  Asset,
  BASE_FEE,
  Contract,
  Horizon,
  TransactionBuilder,
  nativeToScVal,
  rpc as SorobanRpc,
} from '@stellar/stellar-sdk';

import { getNetwork } from './network';
import { registerPasskeySigner } from './passkey';
import { signXdrPayload } from './walletConnect';
import { pollForResult, toStroops } from './sendPayment';
import { getFeePayerAddress } from './activity';

/**
 * The fee-payer's spendable XLM (native balance minus ~1.5 XLM reserve+fees).
 * 0 when the account is missing or unreachable.
 */
export async function getFeePayerSpendableXlm(): Promise<number> {
  try {
    const feePayer = await getFeePayerAddress();
    if (!feePayer) return 0;
    const server = new Horizon.Server(getNetwork().horizonUrl);
    const account = await server.loadAccount(feePayer);
    const native = (account.balances as Array<{ asset_type: string; balance: string }>).find(
      (b) => b.asset_type === 'native',
    );
    return Math.max(0, Number(native?.balance ?? '0') - 1.5);
  } catch {
    return 0;
  }
}

/**
 * Send `amount` XLM out of the smart wallet's own balance to `destination`
 * (classic or contract). Prompts the passkey for the auth-entry signature; the
 * fee-payer wraps and pays the fee. Resolves with the transaction hash.
 */
export async function sendXlmFromContract(
  contractAddress: string,
  destination: string,
  amount: string,
): Promise<string> {
  const network = getNetwork();
  const server = new SorobanRpc.Server(network.rpcUrl);

  const feePayer = await getFeePayerAddress();
  if (!feePayer) throw new Error('No fee-payer key on this device.');

  // The native SAC id is deterministic per network — no config needed.
  const nativeSac = Asset.native().contractId(network.networkPassphrase);
  const contract = new Contract(nativeSac);

  const account = await server.getAccount(feePayer);
  const unsigned = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: network.networkPassphrase,
  })
    .addOperation(
      contract.call(
        'transfer',
        nativeToScVal(contractAddress, { type: 'address' }),
        nativeToScVal(destination, { type: 'address' }),
        nativeToScVal(toStroops(amount), { type: 'i128' }),
      ),
    )
    .setTimeout(60)
    .build();

  // The passkey signer answers the auth-entry signature requests.
  const unregister = registerPasskeySigner();
  try {
    const signedXdr = await signXdrPayload(unsigned.toXDR());
    const signedTx = TransactionBuilder.fromXDR(signedXdr, network.networkPassphrase);
    const sendResult = await server.sendTransaction(signedTx);
    if (sendResult.status === 'ERROR') {
      throw new Error(`Transaction rejected: ${sendResult.errorResult?.toXDR('base64') ?? 'unknown'}`);
    }
    return await pollForResult(server, sendResult.hash);
  } finally {
    unregister();
  }
}
