/**
 * Platform Wallet Generator
 * Writes keys directly to .env.local
 */

import { Keypair } from '@solana/web3.js';
import * as bs58 from 'bs58';
import * as fs from 'fs';
import * as path from 'path';

const keypair = Keypair.generate();
const publicKey = keypair.publicKey.toBase58();
const secretKeyBase58 = bs58.default.encode(keypair.secretKey);

const envContent = `
# Platform Wallet (Auto-generated)
NEXT_PUBLIC_TREASURY_ADDRESS=${publicKey}
PLATFORM_WALLET_PRIVATE_KEY=${secretKeyBase58}
`;

const envPath = path.join(process.cwd(), '.env.local');

// Append to .env.local
fs.appendFileSync(envPath, envContent);

console.log('✅ Platform wallet generated and added to .env.local');
console.log(`📍 Treasury Address: ${publicKey}`);
