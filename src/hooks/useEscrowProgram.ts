// src/hooks/useEscrowProgram.ts
import * as anchor from "@project-serum/anchor";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";

// Program ID must match the ID declared in lib.rs
const ESCROW_PROGRAM_ID = new PublicKey("Escrow111111111111111111111111111111111111");

// Initialize Anchor provider (devnet)
const connection = new Connection(clusterApiUrl("devnet"), "processed");
const wallet = anchor.Wallet.local(); // uses local keypair (~/.config/solana/id.json)
const provider = new anchor.AnchorProvider(connection, wallet, { preflightCommitment: "processed" });
anchor.setProvider(provider);

// Load the IDL (you would generate this with `anchor idl init`)
// For simplicity, we embed a minimal IDL matching our program
const escrowIdl = {
    version: "0.0.0",
    name: "escrow_program",
    instructions: [
        {
            name: "initializeListing",
            accounts: [
                { name: "escrowAccount", isMut: true, isSigner: false },
                { name: "seller", isMut: true, isSigner: true },
                { name: "systemProgram", isMut: false, isSigner: false }
            ],
            args: [
                { name: "assetAddress", type: "publicKey" },
                { name: "price", type: "u64" }
            ]
        },
        {
            name: "purchase",
            accounts: [
                { name: "escrowAccount", isMut: true, isSigner: false },
                { name: "seller", isMut: true, isSigner: true },
                { name: "buyer", isMut: true, isSigner: true },
                { name: "asset", isMut: false, isSigner: false },
                { name: "coreProgram", isMut: false, isSigner: false },
                { name: "systemProgram", isMut: false, isSigner: false },
                { name: "tokenProgram", isMut: false, isSigner: false }
            ],
            args: [{ name: "buyer", type: "publicKey" }]
        }
    ],
    accounts: [
        {
            name: "escrowAccount",
            type: {
                kind: "struct",
                fields: [
                    { name: "seller", type: "publicKey" },
                    { name: "assetAddress", type: "publicKey" },
                    { name: "price", type: "u64" },
                    { name: "isFilled", type: "bool" }
                ]
            }
        }
    ]
} as any;

const program = new anchor.Program(escrowIdl, ESCROW_PROGRAM_ID, provider);

/**
 * Initialize a listing on-chain escrow.
 * @param assetAddress The address of the Metaplex Core asset to list.
 * @param priceLamports Price in lamports.
 */
export async function initEscrowListing(assetAddress: PublicKey, priceLamports: number) {
    const [escrowPda] = await PublicKey.findProgramAddress([
        Buffer.from("escrow"),
        assetAddress.toBuffer()
    ], ESCROW_PROGRAM_ID);

    const tx = await program.methods.initializeListing(assetAddress, new anchor.BN(priceLamports))
        .accounts({
            escrowAccount: escrowPda,
            seller: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
    return { tx, escrowPda };
}

/**
 * Purchase an asset via escrow.
 * @param escrowPda The PDA of the escrow account.
 * @param buyerKey The buyer's public key.
 */
export async function purchaseEscrow(escrowPda: PublicKey, buyerKey: PublicKey) {
    const escrowAccount = await program.account.escrowAccount.fetch(escrowPda) as any;
    const tx = await program.methods.purchase(buyerKey)
        .accounts({
            escrowAccount: escrowPda,
            seller: escrowAccount.seller,
            buyer: buyerKey,
            asset: escrowAccount.assetAddress,
            coreProgram: new PublicKey("Core111111111111111111111111111111111111"), // placeholder Core program ID
            systemProgram: anchor.web3.SystemProgram.programId,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        })
        .rpc();
    return tx;
}

export { program as escrowProgram };
