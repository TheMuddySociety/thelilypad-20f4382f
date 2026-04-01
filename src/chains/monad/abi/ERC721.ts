/**
 * Enhanced ERC-721A ABI for Monad NFT Collections
 *
 * Supports: minting (single, batch, phase-based), supply queries,
 * admin setters, royalties (EIP-2981), and standard ERC-721 reads.
 */

export const MONAD_ERC721_ABI = [
    // ── Minting ───────────────────────────────────────────────────────
    {
        inputs: [
            { internalType: 'address', name: 'to', type: 'address' },
            { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
            { internalType: 'string', name: 'uri', type: 'string' },
        ],
        name: 'mint',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'address', name: 'to', type: 'address' },
            { internalType: 'uint256', name: 'quantity', type: 'uint256' },
        ],
        name: 'batchMint',
        outputs: [],
        stateMutability: 'payable',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'uint256', name: 'quantity', type: 'uint256' },
            { internalType: 'uint256', name: 'phaseId', type: 'uint256' },
            { internalType: 'bytes32[]', name: 'proof', type: 'bytes32[]' },
        ],
        name: 'mintPhase',
        outputs: [],
        stateMutability: 'payable',
        type: 'function',
    },

    // ── Supply & Price ────────────────────────────────────────────────
    {
        inputs: [],
        name: 'totalSupply',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'maxSupply',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'mintPrice',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },

    // ── Metadata ──────────────────────────────────────────────────────
    {
        inputs: [],
        name: 'name',
        outputs: [{ internalType: 'string', name: '', type: 'string' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'symbol',
        outputs: [{ internalType: 'string', name: '', type: 'string' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
        name: 'tokenURI',
        outputs: [{ internalType: 'string', name: '', type: 'string' }],
        stateMutability: 'view',
        type: 'function',
    },

    // ── Ownership ─────────────────────────────────────────────────────
    {
        inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
        name: 'ownerOf',
        outputs: [{ internalType: 'address', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },

    // ── Admin Setters ─────────────────────────────────────────────────
    {
        inputs: [{ internalType: 'string', name: 'baseURI_', type: 'string' }],
        name: 'setBaseURI',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ internalType: 'uint256', name: 'price', type: 'uint256' }],
        name: 'setMintPrice',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'uint256', name: 'phaseId', type: 'uint256' },
            { internalType: 'bytes32', name: 'merkleRoot', type: 'bytes32' },
            { internalType: 'uint256', name: 'price', type: 'uint256' },
            { internalType: 'uint256', name: 'startTime', type: 'uint256' },
            { internalType: 'uint256', name: 'endTime', type: 'uint256' },
            { internalType: 'uint256', name: 'maxPerWallet', type: 'uint256' },
        ],
        name: 'setPhase',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'withdraw',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },

    // ── Royalties (EIP-2981) ──────────────────────────────────────────
    {
        inputs: [
            { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
            { internalType: 'uint256', name: 'salePrice', type: 'uint256' },
        ],
        name: 'royaltyInfo',
        outputs: [
            { internalType: 'address', name: 'receiver', type: 'address' },
            { internalType: 'uint256', name: 'royaltyAmount', type: 'uint256' },
        ],
        stateMutability: 'view',
        type: 'function',
    },
] as const;
