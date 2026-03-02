import { WebIrys } from "@irys/sdk";
import { ethers } from "ethers";

/**
 * Irys (Arweave) Integration Client
 * Handles permanent storage for Solana, Monad (EVM), and XRPL.
 */

export const IRYS_NODE_DEV = "https://devnet.irys.xyz";
export const IRYS_NODE_MAIN = "https://node1.irys.xyz";

/**
 * Get Irys instance based on wallet and chain
 */
export async function getWebIrys(
    wallet: {
        address: string | null;
        chainType: string;
        network: string;
    },
) {
    const isMainnet = wallet.network === 'mainnet';
    const nodeUrl = isMainnet ? IRYS_NODE_MAIN : IRYS_NODE_DEV;

    if (wallet.chainType === 'solana') {
        const provider = (window as any).phantom?.solana || (window as any).solana;
        if (!provider) throw new Error("Solana wallet not detected");

        const irys = new WebIrys({
            url: nodeUrl,
            token: "solana",
            wallet: { provider },
        });
        await irys.ready();
        return irys;
    } else if (wallet.chainType === 'monad' || wallet.chainType === 'ethereum') {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const irys = new WebIrys({
            url: nodeUrl,
            token: "ethereum",
            wallet: { provider },
        });
        await irys.ready();
        return irys;
    } else {
        throw new Error(`Irys storage payment not yet configured for ${wallet.chainType}. Please use Solana or Monad for payment.`);
    }
}

/**
 * Upload a file to Arweave via Irys
 */
export async function uploadToArweave(
    file: File | Blob,
    wallet: any,
) {
    const irys = await getWebIrys(wallet);

    // Check price and balance
    const price = await irys.getPrice(file.size);
    const balance = await irys.getLoadedBalance();

    if (balance.lt(price)) {
        const toFund = price.minus(balance);
        console.log(`[Irys] Funding node with ${toFund.toString()}...`);
        await irys.fund(toFund);
    }

    const tags = [
        { name: "Content-Type", value: file.type || "application/octet-stream" },
        { name: "App-Name", value: "The Lily Pad" },
    ];

    const data = await file.arrayBuffer();
    const response = await irys.upload(Buffer.from(data), { tags });

    return `https://arweave.net/${response.id}`;
}

/**
 * Upload JSON metadata to Arweave via Irys
 */
export async function uploadMetadataToArweave(metadata: any, wallet: any) {
    const json = JSON.stringify(metadata, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const file = new File([blob], "metadata.json", { type: "application/json" });

    return uploadToArweave(file, wallet);
}
