import { WebUploader } from "@irys/web-upload";
import { WebSolana } from "@irys/web-upload-solana";

export async function test() {
    const irys = await WebUploader(WebSolana).withProvider({}).devnet();

    // Just want to see type checks
    const price = await irys.getPrice(100);
    const bal = await irys.getLoadedBalance();
    await irys.fund(price);
    await irys.upload(new Uint8Array([1, 2, 3]), { tags: [] });
}
