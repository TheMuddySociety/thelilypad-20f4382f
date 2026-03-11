import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { generateSigner, publicKey, some } from '@metaplex-foundation/umi';
import { createTree, createTreeV2, mintV2 } from '@metaplex-foundation/mpl-bubblegum';
import { keypairIdentity } from '@metaplex-foundation/umi';

async function test() {
    const umi = createUmi('https://api.devnet.solana.com');
    const kp = umi.eddsa.generateKeypair();
    umi.use(keypairIdentity(kp));
    
    // airdrop 
    const airdrop = await umi.rpc.airdrop(umi.identity.publicKey, 1000000000);
    console.log("airdrop complete");
    await new Promise(r => setTimeout(r, 2000));
    
    const tree = generateSigner(umi);
    try {
        const builder = await createTree(umi, {
            merkleTree: tree,
            maxDepth: 14,
            maxBufferSize: 64,
        });
        await builder.sendAndConfirm(umi);
        console.log("Tree 1 created!");
    } catch (e) { console.error("Tree 1 fail", e.message); }
    
    const tree2 = generateSigner(umi);
    try {
        const builder2 = await createTreeV2(umi, {
            merkleTree: tree2,
            maxDepth: 14,
            maxBufferSize: 64,
        });
        await builder2.sendAndConfirm(umi);
        console.log("Tree 2 created!");
    } catch (e) { console.error("Tree 2 fail", e.message); }
}

test().catch(console.error);
