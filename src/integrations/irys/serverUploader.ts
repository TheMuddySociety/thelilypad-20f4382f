import { Uploader } from "@irys/upload";
import { Solana } from "@irys/upload-solana";

export const getIrysUploader = async () => {
    // Uses the modern Irys Uploader initialized with a Solana Hot Wallet
    // Requires PRIVATE_KEY securely available in the environment
    const irysUploader = await Uploader(Solana).withWallet(process.env.PRIVATE_KEY);
    return irysUploader;
};
