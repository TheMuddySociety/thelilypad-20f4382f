/**
 * Platform Wallet Generator (UMI version)
 * 
 * Generates a new Solana keypair for use as the Platform Treasury/Authority.
 * 
 * Run: npx tsx scripts/generate-platform-wallet.ts
 * 
 * IMPORTANT: Store the private key securely! Add it to your .env.local as:
 * PLATFORM_WALLET_PRIVATE_KEY=<the base58 private key>
 * VITE_TREASURY_ADDRESS=<the public key>
 */

import { generateKeyPairSigner } from '@metaplex-foundation/umi';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { base58 } from '@metaplex-foundation/umi/serializers';

async function main() {
    console.log('\n🔐 Platform Wallet Generator\n');
    console.log('='.repeat(50));

    // Create a minimal Umi instance
    const umi = createUmi('https://api.devnet.solana.com');

    // Generate a new keypair
    const keypair = await generateKeyPairSigner(umi);

    // Get the public key as base58 string
    const publicKey = keypair.publicKey.toString();

    // Encode the secret key as base58 string
    // The secretKey is a Uint8Array of 64 bytes (32 private + 32 public)
    const secretKeyBase58 = base58.serialize(keypair.secretKey);

    console.log('\n✅ New Platform Wallet Generated!\n');
    console.log('📍 Public Key (Treasury Address):');
    console.log(`   ${publicKey}\n`);
    console.log('🔑 Private Key (Keep Secret!):');
    console.log(`   ${secretKeyBase58}\n`);
    console.log('='.repeat(50));
    console.log('\n📝 Add these to your .env.local:\n');
    console.log(`VITE_TREASURY_ADDRESS=${publicKey}`);
    console.log(`PLATFORM_WALLET_PRIVATE_KEY=${secretKeyBase58}`);
    console.log('\n⚠️  WARNING: Never commit the private key to git!\n');
}

main().catch(console.error);
