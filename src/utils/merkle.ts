import { MerkleTree } from "merkletreejs";
import { keccak_256 } from "js-sha3";
import { PublicKey } from "@solana/web3.js";
import { Buffer } from "buffer";

export interface AllowlistEntry {
    walletAddress: string;
    maxMint: number;
}

// Validate Solana address
export const isValidAddress = (address: string): boolean => {
    try {
        new PublicKey(address);
        return true;
    } catch {
        return false;
    }
};

// Generate leaf for Merkle tree (Solana address)
export const generateLeaf = (address: string): string => {
    try {
        const buffer = new PublicKey(address).toBuffer();
        return keccak_256(buffer);
    } catch (e) {
        return "";
    }
};

// Generate leaf with max mint amount
export const generateLeafWithAmount = (address: string, maxMint: number): string => {
    try {
        // For AllowList guard in Candy Machine v3, usually it is just address.
        // If using custom layout or MintLimit, we still just need to proof the membership.
        // However, if we want to enforce maxMint via Merkle Root (not MintLimit guard), 
        // we would need a custom guard or standard.
        // Current AllowlistManager implementation supports this distinction, so we keep it.
        // Note: Standard CM AllowList guard does NOT verify amount in the leaf. 
        // It verifies the address is in the tree.
        return generateLeaf(address);
    } catch (e) {
        return "";
    }
};

export const getMerkleTree = (entries: AllowlistEntry[]) => {
    const leaves = entries
        .filter(e => isValidAddress(e.walletAddress))
        .map(entry => generateLeaf(entry.walletAddress));

    return new MerkleTree(leaves, (data: Buffer) => Buffer.from(keccak_256(data), 'hex'), { sortPairs: true });
};

export const getMerkleProof = (entries: AllowlistEntry[], walletAddress: string) => {
    const tree = getMerkleTree(entries);
    const leaf = generateLeaf(walletAddress);
    const proof = tree.getHexProof(leaf);
    return { root: tree.getHexRoot(), proof, leaf };
};
