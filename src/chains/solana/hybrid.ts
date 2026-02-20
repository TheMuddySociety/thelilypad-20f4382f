/**
 * MPL-Hybrid (MPL-404) – Escrow-based NFT ↔ Token swap program
 *
 * Implements: initEscrowV1, captureV1, releaseV1
 * Docs: https://developers.metaplex.com/smart-contracts/mpl-hybrid
 */

import {
  initEscrowV1,
  captureV1,
  releaseV1,
  mplHybrid,
  MPL_HYBRID_PROGRAM_ID,
} from '@metaplex-foundation/mpl-hybrid';
import {
  publicKey as toPublicKey,
} from '@metaplex-foundation/umi';
import { string, publicKey as publicKeySerializer } from '@metaplex-foundation/umi/serializers';
import type { Umi, Pda } from '@metaplex-foundation/umi';
import { fetchAssetsByCollection } from '@metaplex-foundation/mpl-core';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Add decimal zeros to a human-readable amount */
function addZeros(num: number, decimals: number): number {
  return num * Math.pow(10, decimals);
}

/** Derive the canonical escrow PDA for a collection */
export function deriveEscrowPda(umi: Umi, collectionAddress: string): Pda {
  return umi.eddsa.findPda(MPL_HYBRID_PROGRAM_ID, [
    string({ size: 'variable' }).serialize('escrow'),
    publicKeySerializer().serialize(toPublicKey(collectionAddress)),
  ]);
}

// ── Register plugin ────────────────────────────────────────────────────────────

/** Call once when building the Umi instance: `umi.use(mplHybrid())` */
export { mplHybrid };

// ── Escrow Config ──────────────────────────────────────────────────────────────

export interface HybridEscrowConfig {
  /** Display name for the escrow */
  name: string;
  /** Base URI for deterministic metadata (Arweave manifest) */
  uri: string;
  /** Max URI index (inclusive) */
  max: number;
  /** Min URI index (inclusive) */
  min: number;
  /** 0 = update metadata on swap, 1 = keep metadata unchanged */
  path: 0 | 1;
  /** Collection mint address */
  collectionAddress: string;
  /** Fungible token mint address */
  tokenAddress: string;
  /** Wallet that receives swap fees */
  feeWalletAddress: string;
  /** Token amount the user receives per swap (human-readable) */
  swapAmount: number;
  /** Token fee charged when swapping to NFT (human-readable) */
  feeAmount: number;
  /** SOL fee charged when swapping to NFT (in SOL) */
  solFee: number;
  /** Token decimals (default 6) */
  tokenDecimals?: number;
}

// ── Init Escrow ────────────────────────────────────────────────────────────────

export async function initHybridEscrow(umi: Umi, config: HybridEscrowConfig) {
  const decimals = config.tokenDecimals ?? 6;
  const collection = toPublicKey(config.collectionAddress);
  const token = toPublicKey(config.tokenAddress);
  const feeLocation = toPublicKey(config.feeWalletAddress);
  const escrow = deriveEscrowPda(umi, config.collectionAddress);

  const tx = await initEscrowV1(umi, {
    name: config.name,
    uri: config.uri,
    max: config.max,
    min: config.min,
    path: config.path,
    escrow,
    collection,
    token,
    feeLocation,
    amount: addZeros(config.swapAmount, decimals),
    feeAmount: addZeros(config.feeAmount, decimals),
    solFeeAmount: addZeros(config.solFee, 9),
  }).sendAndConfirm(umi);

  return {
    signature: tx.signature,
    escrow,
  };
}

// ── Capture (Token → NFT) ──────────────────────────────────────────────────────

export interface CaptureParams {
  collectionAddress: string;
  tokenAddress: string;
  feeWalletAddress: string;
  /** Specific asset to capture. If omitted, picks a random escrow-owned asset. */
  assetAddress?: string;
}

export async function captureHybridNft(umi: Umi, params: CaptureParams) {
  const collection = toPublicKey(params.collectionAddress);
  const token = toPublicKey(params.tokenAddress);
  const feeProjectAccount = toPublicKey(params.feeWalletAddress);
  const escrow = deriveEscrowPda(umi, params.collectionAddress);

  let asset;
  if (params.assetAddress) {
    asset = toPublicKey(params.assetAddress);
  } else {
    // Pick a random NFT owned by the escrow
    const assets = await fetchAssetsByCollection(umi, collection, {
      skipDerivePlugins: false,
    });
    const escrowKey = toPublicKey(escrow);
    const escrowOwned = assets.filter(
      (a) => a.owner.toString() === escrowKey.toString()
    );
    if (escrowOwned.length === 0) throw new Error('No assets available in escrow');
    asset = escrowOwned[Math.floor(Math.random() * escrowOwned.length)].publicKey;
  }

  const tx = await captureV1(umi, {
    owner: umi.identity,
    escrow,
    asset,
    collection,
    token,
    feeProjectAccount,
  }).sendAndConfirm(umi);

  return { signature: tx.signature, asset };
}

// ── Release (NFT → Token) ──────────────────────────────────────────────────────

export interface ReleaseParams {
  collectionAddress: string;
  tokenAddress: string;
  feeWalletAddress: string;
  /** The asset the user wants to release */
  assetAddress: string;
}

export async function releaseHybridNft(umi: Umi, params: ReleaseParams) {
  const collection = toPublicKey(params.collectionAddress);
  const token = toPublicKey(params.tokenAddress);
  const feeProjectAccount = toPublicKey(params.feeWalletAddress);
  const escrow = deriveEscrowPda(umi, params.collectionAddress);
  const asset = toPublicKey(params.assetAddress);

  const tx = await releaseV1(umi, {
    owner: umi.payer,
    escrow,
    asset,
    collection,
    token,
    feeProjectAccount,
  }).sendAndConfirm(umi);

  return { signature: tx.signature };
}
