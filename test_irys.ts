import { WebUploader } from "@irys/web-upload";
import { WebSolana } from "@irys/web-upload-solana";

async function test() {
    try {
        const irys = await WebUploader(WebSolana).withRpc("https://api.devnet.solana.com").devnet();
        console.log(Object.keys(irys.__proto__));
        console.log(irys);
    } catch (e) {
        console.error(e);
    }
}
test();
