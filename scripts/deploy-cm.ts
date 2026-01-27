import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
    createSignerFromKeypair,
    signerIdentity,
    generateSigner,
    percentAmount,
    some,
    none
} from "@metaplex-foundation/umi";
import {
    create,
    addConfigLines,
    fetchCandyMachine
} from "@metaplex-foundation/mpl-core-candy-machine";
import {
    createCollection,
    fetchCollection
} from "@metaplex-foundation/mpl-core";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import { setComputeUnitPrice } from "@metaplex-foundation/mpl-toolbox";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config();

const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";
const KEYPAIR_PATH = process.env.KEYPAIR_PATH || "./wallet.json";
const ASSETS_DIR = process.env.ASSETS_DIR || "./assets";

async function main() {
    console.log("Initializing Umi...");

    // 1. Setup Umi
    const umi = createUmi(RPC_URL);

    // 2. Load Wallet
    if (!fs.existsSync(KEYPAIR_PATH)) {
        throw new Error(`Wallet file not found at ${KEYPAIR_PATH}`);
    }
    const walletFile = fs.readFileSync(KEYPAIR_PATH, "utf8");
    let keypairData: any;
    try {
        keypairData = JSON.parse(walletFile);
    } catch {
        // Handle raw array format if simpler 
        keypairData = JSON.parse(new TextDecoder().decode(fs.readFileSync(KEYPAIR_PATH)));
    }
    // If it's a standard array [1,2,3...]
    if (!Array.isArray(keypairData) && keypairData.secretKey) {
        keypairData = Object.values(keypairData.secretKey);
    }

    const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(keypairData));
    const signer = createSignerFromKeypair(umi, keypair);
    umi.use(signerIdentity(signer));

    // Use Irys for storage (Devnet default)
    umi.use(irysUploader({ address: "https://devnet.irys.xyz" }));

    console.log(`Wallet loaded: ${signer.publicKey.toString()}`);

    // 3. Create Collection NFT
    console.log("Creating Collection...");
    const collectionSigner = generateSigner(umi);

    await createCollection(umi, {
        collection: collectionSigner,
        name: process.env.COLLECTION_NAME || "My Script Collection",
        uri: "https://example.com/collection.json", // Placeholder - usually should upload collection.json too
        plugins: [
            {
                type: "Royalties",
                basisPoints: (parseInt(process.env.ROYALTY_PERCENT || "5") * 100),
                creators: [{ address: signer.publicKey, percentage: 100 }],
                ruleSet: { type: "None" }, // Compatibility
            },
        ],
    }).sendAndConfirm(umi);

    console.log(`Collection Deployed: ${collectionSigner.publicKey.toString()}`);

    // 4. Create Candy Machine
    console.log("Creating Candy Machine...");
    const candyMachineSigner = generateSigner(umi);

    const supply = parseInt(process.env.TOTAL_SUPPLY || "10");

    await create(umi, {
        candyMachine: candyMachineSigner,
        collection: collectionSigner.publicKey,
        collectionUpdateAuthority: umi.identity,
        itemsAvailable: supply,
        configLineSettings: some({
            prefixName: "",
            nameLength: 32,
            prefixUri: "",
            uriLength: 200,
            isSequential: false,
        }),
    }).sendAndConfirm(umi);

    console.log(`Candy Machine Deployed: ${candyMachineSigner.publicKey.toString()}`);

    // 5. Read Assets and Upload
    console.log(`Reading assets from ${ASSETS_DIR}...`);
    if (!fs.existsSync(ASSETS_DIR)) {
        throw new Error("Assets directory not found!");
    }

    const files = fs.readdirSync(ASSETS_DIR);
    const jsonFiles = files.filter(f => f.endsWith(".json"));

    const configLines: { name: string; uri: string }[] = [];

    // This is a simplified "Mock Upload" or "Direct URI" step.
    // In a real script, we would upload each image+json to Irys here.
    // For this demonstration/template, we assumes user MIGHT want to just insert.
    // Let's implement actual upload for completeness.

    console.log(`Found ${jsonFiles.length} items. Uploading...`);

    for (const jsonFile of jsonFiles) {
        const name = jsonFile.replace(".json", "");
        const imageFile = files.find(f => f.startsWith(name) && f !== jsonFile);

        if (!imageFile) {
            console.warn(`No image found for ${jsonFile}, skipping.`);
            continue;
        }

        const jsonPath = path.join(ASSETS_DIR, jsonFile);
        const imagePath = path.join(ASSETS_DIR, imageFile);

        const imageBuffer = fs.readFileSync(imagePath);
        const jsonContent = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

        // Upload Image
        const [imageUri] = await umi.uploader.upload([createGenericFile(imageBuffer, imageFile)]);

        // Update JSON with new Image URI
        jsonContent.image = imageUri;

        // Upload JSON
        const uri = await umi.uploader.uploadJson(jsonContent);

        configLines.push({
            name: jsonContent.name || `${process.env.COLLECTION_NAME} #${name}`,
            uri: uri
        });
        console.log(`Uploaded ${name}: ${uri}`);
    }

    // 6. Insert Items
    if (configLines.length > 0) {
        console.log("Inserting items...");
        await addConfigLines(umi, {
            candyMachine: candyMachineSigner.publicKey,
            index: 0,
            configLines: configLines,
        }).sendAndConfirm(umi);
        console.log("Items inserted!");
    }

    console.log("----------------------------------------");
    console.log("DEPLOYMENT COMPLETE");
    console.log(`Candy Machine ID: ${candyMachineSigner.publicKey.toString()}`);
    console.log(`Collection Address: ${collectionSigner.publicKey.toString()}`);
    console.log("----------------------------------------");

    // Save to output file
    fs.writeFileSync("deployment-output.txt", `Candy Machine: ${candyMachineSigner.publicKey.toString()}\nCollection: ${collectionSigner.publicKey.toString()}`);
}

// Helper for Umi file creation (mocking/adapting since we are in node)
function createGenericFile(buffer: Buffer, fileName: string) {
    return {
        buffer,
        fileName,
        displayName: fileName,
        uniqueName: fileName,
        contentType: getContentType(fileName),
        extension: fileName.split('.').pop() || '',
        tags: []
    };
}

function getContentType(fileName: string) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'png') return 'image/png';
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    if (ext === 'gif') return 'image/gif';
    return 'application/octet-stream';
}

main().catch(console.error);
