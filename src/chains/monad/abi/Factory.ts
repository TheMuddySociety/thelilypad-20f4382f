/**
 * ERC-721A Factory ABI for Monad
 *
 * Deploys new NFT collections via a factory pattern.
 * The factory creates minimal proxy clones of the ERC-721A implementation.
 */

export const MONAD_FACTORY_ABI = [
    {
        inputs: [
            { internalType: 'string', name: 'name', type: 'string' },
            { internalType: 'string', name: 'symbol', type: 'string' },
            { internalType: 'string', name: 'baseURI', type: 'string' },
            { internalType: 'uint256', name: 'maxSupply', type: 'uint256' },
            { internalType: 'uint256', name: 'mintPrice', type: 'uint256' },
            { internalType: 'uint96', name: 'royaltyBPS', type: 'uint96' },
            { internalType: 'address', name: 'fundsRecipient', type: 'address' },
        ],
        name: 'createCollection',
        outputs: [{ internalType: 'address', name: 'collection', type: 'address' }],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: 'address', name: 'collection', type: 'address' },
            { indexed: true, internalType: 'address', name: 'creator', type: 'address' },
            { indexed: false, internalType: 'string', name: 'name', type: 'string' },
            { indexed: false, internalType: 'string', name: 'symbol', type: 'string' },
        ],
        name: 'CollectionCreated',
        type: 'event',
    },
    {
        inputs: [],
        name: 'implementation',
        outputs: [{ internalType: 'address', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'collectionsCount',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ internalType: 'address', name: 'creator', type: 'address' }],
        name: 'getCollections',
        outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;
