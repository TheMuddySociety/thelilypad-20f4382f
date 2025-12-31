// EIP-712 Type Definitions for Gasless Transactions on The Lily Pad

// Monad chain IDs
export const MONAD_MAINNET_CHAIN_ID = 143;
export const MONAD_TESTNET_CHAIN_ID = 10143;

// Domain separator for The Lily Pad
export const getEIP712Domain = (chainId: number) => ({
  name: "The Lily Pad",
  version: "1",
  chainId,
});

// Type definitions for different gasless actions (mutable for compatibility)
export const MINT_REQUEST_TYPES = {
  MintRequest: [
    { name: "from", type: "address" },
    { name: "collection", type: "address" },
    { name: "quantity", type: "uint256" },
    { name: "maxPrice", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};

export const LISTING_REQUEST_TYPES = {
  ListingRequest: [
    { name: "from", type: "address" },
    { name: "collection", type: "address" },
    { name: "tokenId", type: "uint256" },
    { name: "price", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};

export const OFFER_REQUEST_TYPES = {
  OfferRequest: [
    { name: "from", type: "address" },
    { name: "collection", type: "address" },
    { name: "tokenId", type: "uint256" },
    { name: "amount", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};

// TypeScript interfaces
export interface MintRequest {
  from: string;
  collection: string;
  quantity: number;
  maxPrice: string; // Wei value as string
  nonce: number;
  deadline: number; // Unix timestamp
}

export interface ListingRequest {
  from: string;
  collection: string;
  tokenId: number;
  price: string; // Wei value as string
  nonce: number;
  deadline: number;
}

export interface OfferRequest {
  from: string;
  collection: string;
  tokenId: number;
  amount: string; // Wei value as string
  nonce: number;
  deadline: number;
}

export type GaslessActionType = 'mint' | 'list' | 'offer' | 'transfer' | 'cancel';

export interface MetaTransactionRequest {
  actionType: GaslessActionType;
  typedData: {
    domain: ReturnType<typeof getEIP712Domain>;
    types: typeof MINT_REQUEST_TYPES | typeof LISTING_REQUEST_TYPES | typeof OFFER_REQUEST_TYPES;
    primaryType: string;
    message: MintRequest | ListingRequest | OfferRequest;
  };
  signature: string;
  collectionId?: string;
}

export interface MetaTransactionStatus {
  id: string;
  status: 'pending' | 'submitted' | 'confirmed' | 'failed' | 'expired';
  txHash?: string;
  errorMessage?: string;
  gasUsed?: number;
}

// Helper to create typed data for minting
export function createMintTypedData(
  request: MintRequest,
  chainId: number
) {
  return {
    domain: getEIP712Domain(chainId),
    types: MINT_REQUEST_TYPES,
    primaryType: "MintRequest" as const,
    message: {
      from: request.from as `0x${string}`,
      collection: request.collection as `0x${string}`,
      quantity: BigInt(request.quantity),
      maxPrice: BigInt(request.maxPrice),
      nonce: BigInt(request.nonce),
      deadline: BigInt(request.deadline),
    },
  };
}

// Helper to create typed data for listing
export function createListingTypedData(
  request: ListingRequest,
  chainId: number
) {
  return {
    domain: getEIP712Domain(chainId),
    types: LISTING_REQUEST_TYPES,
    primaryType: "ListingRequest" as const,
    message: {
      from: request.from as `0x${string}`,
      collection: request.collection as `0x${string}`,
      tokenId: BigInt(request.tokenId),
      price: BigInt(request.price),
      nonce: BigInt(request.nonce),
      deadline: BigInt(request.deadline),
    },
  };
}

// Helper to create typed data for offer
export function createOfferTypedData(
  request: OfferRequest,
  chainId: number
) {
  return {
    domain: getEIP712Domain(chainId),
    types: OFFER_REQUEST_TYPES,
    primaryType: "OfferRequest" as const,
    message: {
      from: request.from as `0x${string}`,
      collection: request.collection as `0x${string}`,
      tokenId: BigInt(request.tokenId),
      amount: BigInt(request.amount),
      nonce: BigInt(request.nonce),
      deadline: BigInt(request.deadline),
    },
  };
}

// Signature expiry time (5 minutes)
export const SIGNATURE_EXPIRY_SECONDS = 300;

// Calculate deadline from now
export function getDeadline(): number {
  return Math.floor(Date.now() / 1000) + SIGNATURE_EXPIRY_SECONDS;
}
