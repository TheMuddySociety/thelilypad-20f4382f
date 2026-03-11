/**
 * XRPL Non-Custodial Browser Wallet
 *
 * Generates and manages XRPL wallets client-side.
 * Private keys never leave the browser.
 *
 * Seeds are encrypted at rest using AES-GCM via the Web Crypto API.
 * The encryption key is derived with PBKDF2 from an application salt
 * combined with the wallet address, making each wallet's cipher unique.
 */

import { Client, Wallet, xrpToDrops, dropsToXrp } from 'xrpl';
import { getXRPLEndpoint, type XRPLNetwork } from '@/chains/xrpl/client';

export type XRPLNetworkType = XRPLNetwork;

const STORAGE_KEY = 'xrpl_wallet_encrypted';
const NETWORK_KEY = 'xrpl_network';

// ── AES-GCM Encryption Helpers ──────────────────────────────────────────────

/**
 * Application-level salt for key derivation.
 * Combined with the wallet address to derive a unique AES key per wallet.
 */
const APP_SALT = 'TheLilyPad-XRPL-Vault-v1-2026';

/** Derive an AES-GCM key from the app salt + wallet address via PBKDF2. */
async function deriveKey(address: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(APP_SALT + address),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('lilypad-xrpl-' + address),
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Encrypt a plaintext string → base64(iv + ciphertext). */
async function encryptSeed(seed: string, address: string): Promise<string> {
  const key = await deriveKey(address);
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(seed),
  );
  // Concatenate iv + ciphertext and base64 encode
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.byteLength);
  return btoa(String.fromCharCode(...combined));
}

/** Decrypt base64(iv + ciphertext) → plaintext seed. */
async function decryptSeed(encrypted: string, address: string): Promise<string> {
  const key = await deriveKey(address);
  const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  );
  return new TextDecoder().decode(decrypted);
}

// ── Wallet Management ───────────────────────────────────────────────────────

export interface StoredXRPLWallet {
  address: string;
  seed: string;
  publicKey: string;
}

/** Shape stored in localStorage (seed is encrypted). */
interface EncryptedWalletData {
  version: 2;
  address: string;
  publicKey: string;
  encryptedSeed: string; // AES-GCM encrypted, base64
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

/**
 * Save wallet to localStorage with AES-GCM encryption.
 * Only the seed is encrypted; address and publicKey are public info.
 */
export async function saveXRPLWallet(wallet: StoredXRPLWallet): Promise<void> {
  const encryptedSeed = await encryptSeed(wallet.seed, wallet.address);
  const data: EncryptedWalletData = {
    version: 2,
    address: wallet.address,
    publicKey: wallet.publicKey,
    encryptedSeed,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Load wallet from localStorage, decrypting the seed.
 * Supports both v2 (encrypted) and legacy v1 (base64 obfuscated) formats.
 */
export async function loadXRPLWallet(): Promise<StoredXRPLWallet | null> {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  try {
    // Try v2 encrypted format (JSON with version field)
    const parsed = JSON.parse(stored);
    if (parsed.version === 2 && parsed.encryptedSeed) {
      const seed = await decryptSeed(parsed.encryptedSeed, parsed.address);
      return {
        address: parsed.address,
        seed,
        publicKey: parsed.publicKey,
      };
    }

    // v2 format without version flag but has address → still encrypted
    if (parsed.encryptedSeed && parsed.address) {
      const seed = await decryptSeed(parsed.encryptedSeed, parsed.address);
      return { address: parsed.address, seed, publicKey: parsed.publicKey };
    }

    // Legacy format: plain JSON object (from older code paths)
    if (parsed.seed && parsed.address) {
      const wallet: StoredXRPLWallet = parsed;
      // Auto-migrate to encrypted format
      await saveXRPLWallet(wallet);
      console.log('[XRPL Wallet] Migrated legacy wallet to encrypted format');
      return wallet;
    }
  } catch {
    // Not JSON — try legacy base64 format
    try {
      const decoded = JSON.parse(atob(stored));
      if (decoded.seed && decoded.address) {
        // Auto-migrate from base64 to encrypted
        await saveXRPLWallet(decoded);
        console.log('[XRPL Wallet] Migrated base64 wallet to encrypted format');
        return decoded;
      }
    } catch {
      // Completely unreadable
      console.error('[XRPL Wallet] Failed to load wallet — corrupt data');
    }
  }

  return null;
}

/**
 * Synchronous check for whether a wallet exists (does NOT decrypt).
 * Use this for quick boolean checks without awaiting.
 */
export function hasStoredXRPLWallet(): boolean {
  return !!localStorage.getItem(STORAGE_KEY);
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

// ── Client Operations ───────────────────────────────────────────────────────

/** Create and connect an XRPL client */
export async function connectXRPLClient(network: XRPLNetworkType = 'testnet'): Promise<Client> {
  const client = new Client(getXRPLEndpoint(network));
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
    return String(dropsToXrp(drops)); // uses xrpl.js library — handles precision correctly
  } catch (error: any) {
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
      // xrpToDrops() handles precision correctly (returns string of integer drops)
      Amount: xrpToDrops(amount),
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
    const storedWallet = await loadXRPLWallet();
    if (!storedWallet) return false;
    await client.fundWallet(Wallet.fromSeed(storedWallet.seed));
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
