/**
 * XRPL Non-Custodial Browser Wallet
 * 
 * Generates and manages XRPL wallets client-side.
 * Private keys never leave the browser.
 */

import { Client, Wallet, xrpToDrops, dropsToXrp } from 'xrpl';

export type XRPLNetworkType = 'mainnet' | 'testnet' | 'devnet';

const XRPL_ENDPOINTS: Record<XRPLNetworkType, string> = {
  mainnet: 'wss://xrplcluster.com',
  testnet: 'wss://s.altnet.rippletest.net:51233',
  devnet: 'wss://s.devnet.rippletest.net:51233',
};

const STORAGE_KEY = 'xrpl_wallet_encrypted';
const NETWORK_KEY = 'xrpl_network';

// ---- Wallet Management ----

export interface StoredXRPLWallet {
  address: string;
  seed: string; // In production, encrypt this
  publicKey: string;
}

/** Generate a new XRPL wallet */
export function generateXRPLWallet(): StoredXRPLWallet {
  const wallet = Wallet.generate();
  return {
    address: wallet.classicAddress,
    seed: wallet.seed!,
    publicKey: wallet.publicKey,
  };
}

/** Import wallet from seed/secret */
export function importXRPLWallet(seed: string): StoredXRPLWallet {
  const wallet = Wallet.fromSeed(seed);
  return {
    address: wallet.classicAddress,
    seed: wallet.seed!,
    publicKey: wallet.publicKey,
  };
}

/** Save wallet to localStorage (basic - in production use encryption) */
export function saveXRPLWallet(wallet: StoredXRPLWallet): void {
  // Basic obfuscation - in production use a password-derived key
  const encoded = btoa(JSON.stringify(wallet));
  localStorage.setItem(STORAGE_KEY, encoded);
}

/** Load wallet from localStorage */
export function loadXRPLWallet(): StoredXRPLWallet | null {
  const encoded = localStorage.getItem(STORAGE_KEY);
  if (!encoded) return null;
  try {
    return JSON.parse(atob(encoded));
  } catch {
    return null;
  }
}

/** Clear stored wallet */
export function clearXRPLWallet(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Get stored network preference */
export function getXRPLNetwork(): XRPLNetworkType {
  return (localStorage.getItem(NETWORK_KEY) as XRPLNetworkType) || 'testnet';
}

/** Set network preference */
export function setXRPLNetwork(network: XRPLNetworkType): void {
  localStorage.setItem(NETWORK_KEY, network);
}

// ---- Client Operations ----

/** Create and connect an XRPL client */
export async function connectXRPLClient(network: XRPLNetworkType = 'testnet'): Promise<Client> {
  const client = new Client(XRPL_ENDPOINTS[network]);
  await client.connect();
  return client;
}

/** Fetch XRP balance for an address */
export async function fetchXRPBalance(address: string, network: XRPLNetworkType = 'testnet'): Promise<string> {
  let client: Client | null = null;
  try {
    client = await connectXRPLClient(network);
    const response = await client.request({
      command: 'account_info',
      account: address,
      ledger_index: 'validated',
    });
    const drops = String(response.result.account_data.Balance);
    return String(Number(drops) / 1_000_000);
  } catch (error: any) {
    // Account not found = 0 balance (not activated)
    if (error?.data?.error === 'actNotFound') {
      return '0';
    }
    console.error('Error fetching XRP balance:', error);
    return '0';
  } finally {
    if (client?.isConnected()) {
      await client.disconnect();
    }
  }
}

/** Send XRP payment */
export async function sendXRP(
  seed: string,
  destination: string,
  amount: string,
  network: XRPLNetworkType = 'testnet',
  destinationTag?: number
): Promise<{ success: boolean; hash?: string; error?: string }> {
  let client: Client | null = null;
  try {
    client = await connectXRPLClient(network);
    const wallet = Wallet.fromSeed(seed);

    const prepared = await client.autofill({
      TransactionType: 'Payment',
      Account: wallet.classicAddress,
      Amount: String(Math.round(Number(amount) * 1_000_000)),
      Destination: destination,
      ...(destinationTag !== undefined ? { DestinationTag: destinationTag } : {}) as any,
    });

    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);

    const meta = result.result.meta;
    const txResult = typeof meta === 'object' && meta !== null && 'TransactionResult' in meta
      ? (meta as any).TransactionResult
      : 'unknown';

    if (txResult === 'tesSUCCESS') {
      return { success: true, hash: signed.hash };
    }
    return { success: false, error: `Transaction failed: ${txResult}` };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Transaction failed' };
  } finally {
    if (client?.isConnected()) {
      await client.disconnect();
    }
  }
}

/** Fund a testnet/devnet wallet via faucet */
export async function fundXRPLTestnetWallet(address: string, network: XRPLNetworkType = 'testnet'): Promise<boolean> {
  if (network === 'mainnet') return false;
  
  let client: Client | null = null;
  try {
    client = await connectXRPLClient(network);
    await client.fundWallet(Wallet.fromSeed(loadXRPLWallet()?.seed || ''));
    return true;
  } catch (error) {
    console.error('Faucet error:', error);
    return false;
  } finally {
    if (client?.isConnected()) {
      await client.disconnect();
    }
  }
}

/** Get XRPL explorer URL */
export function getXRPLExplorerUrl(hash: string, type: 'tx' | 'account' = 'tx', network: XRPLNetworkType = 'testnet'): string {
  const base = network === 'mainnet' ? 'https://livenet.xrpl.org' :
               network === 'testnet' ? 'https://testnet.xrpl.org' :
               'https://devnet.xrpl.org';
  return type === 'tx' ? `${base}/transactions/${hash}` : `${base}/accounts/${hash}`;
}
