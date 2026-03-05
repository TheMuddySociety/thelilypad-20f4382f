# XRPL NFT Image Resolution and Aspect Ratio with Irys/Arweave

XRPL (XRP Ledger) NFTs use the native NFToken standard, where the image (or any asset) is stored off-chain and linked via a URI field in the NFTokenMint transaction. This URI is limited to **256 bytes** (e.g., an Arweave URL like [https://arweave.net/tx_id](https://arweave.net/tx_id) fits easily), but XRPL itself imposes **no restrictions on image resolution, aspect ratio, or file size**—those come from your storage provider (Irys/Arweave), viewer/wallet rendering capabilities, and practical considerations like upload costs and performance. Since you're using Irys/Arweave for permanent storage, let's break this down for your no-code launchpad, focusing on allowing creators to upload from low-res (e.g., 500x500) to high-res (2000x2000 minimum, up to 4000x4000 or higher as you prefer).

#### Maximum Resolution and Aspect Ratio Limits

- **No Hard Limits from XRPL**: The ledger doesn't care about the image—it's just a pointer. As long as the URI resolves to valid metadata (e.g., JSON with an image field pointing to your high-res file on Arweave), it's fine. XRPL viewers like Xaman or marketplaces (e.g., onXRP) will fetch and display the image, but very high-res files might load slowly on mobile/low-bandwidth devices.
- **No Hard Limits from Irys/Arweave**:
  - Arweave's base transaction data limit is **~10-12 MiB per transaction** (v1: 10 MiB, v2: node-dependent up to 12 MiB). For larger files, Irys uses **bundling** (combining multiple data chunks into one Arweave tx) or **chunked uploads**, allowing files up to **hundreds of GB** in practice (e.g., 492 GB bundles reported, or 5 GB uploads via tools like ArDrive). There's **no storage limitation** overall on Arweave—it's designed for unlimited permanent data.
  - For images: A 4000x4000 PNG (high-res, detailed art) might be 10-50 MB compressed (depending on colors/complexity). This is well within Irys' capabilities—upload via their SDK, and it handles bundling automatically if needed. Even 8000x8000 (ultra-high, ~100-200 MB) is feasible, but costs more (one-time fee ~$0.0005/byte via Irys, payable in SOL for your Solana integration).
  - Aspect Ratio: **Any ratio is supported** (e.g., 1:1 square, 16:9 landscape, 9:16 portrait). No restrictions—images are just files. Common NFT ratios are 1:1 for PFPs or 16:9 for art, but your launchpad can let creators upload freely.
- **Practical Limits and Best Practices for Your Launchpad**:
  - **Resolution Recommendations**: Based on NFT standards, aim for a range creators can select:
    - Low: 500x500-1080x1080 (quick loads, mobile-friendly; e.g., CryptoPunks at 336px).
    - Medium: 2000x2000 (your minimum; balances quality and size ~5-20 MB).
    - High: 3000x3000 or 4000x4000 (recommended for detailed art; ~10-50 MB, printable quality). Higher like 8000x8000 is possible but unnecessary for most NFTs—diminishing returns on quality vs. file size/cost.
    - Why 4000x4000 Works: Fully supported by Irys/Arweave. No "unless it can" issue— it **can** handle it via bundling if over 12 MiB. Test with Irys devnet for free.
  - **File Size Considerations**: Keep under ~100 MB per image to avoid high costs (~$0.05-0.50 via Irys) and slow uploads. Enforce compression in your no-code UI (e.g., use libraries like Sharp.js to resize/optimize on upload). For XRPL wallets like Xaman, aim for <1-5 MB for fast previews (similar to Ledger's <1 MB ideal).
  - **Viewer/Wallet Limits**: Some wallets (e.g., MetaMask for EVM, but relevant for cross-chain) default to 512x512 previews, but full res loads on tap. XRPL-specific: Xaman renders images via the URI, no known res cap, but high-res might cause lag—provide thumbnails in metadata for better UX.

In your architecture: In the XRPL module, validate uploads client-side (e.g., min 2000x2000 via image library), then use Irys SDK to upload to Arweave, get the ar:// URI, and set it in the NFTokenMint tx. This keeps it chain-respectful and scalable.

#### Beta Test Crash Issue: XRPL Generator Crashing and Refreshing to Home

This sounds like a frontend or backend error in your app during the XRPL NFT generation/mint process—possibly related to large file handling, Irys upload failures, or XRPL transaction signing. Since I don't have access to your code, here's a step-by-step debugging guide:

1. **Reproduce the Issue**: Ask the beta tester for details—device/browser, file size/res (e.g., was it high-res like 4000x4000?), exact steps (e.g., after upload or during mint preview). Test yourself with similar inputs.
2. **Check Browser Console/Logs**: Instruct them to open dev tools (F12), reproduce, and share errors (e.g., "Network error on Irys upload" or "XRPL SDK timeout"). Common causes:
  - **File Too Large**: If over browser limits (~2-4 GB for uploads), it crashes. Solution: Chunk uploads in Irys SDK or limit to <100 MB in UI.
  - **Irys/Arweave Upload Fail**: 400 errors if chunks too big (>256 KiB proof size). Use Irys' retry logic or switch to their bundler mode.
  - **Wallet Signing Crash**: Xaman/Phantom integration—QR code scan or WalletConnect might fail on large metadata. Ensure xrpl.js handles big URIs.
  - **Memory/Timeout**: High-res image processing (e.g., preview generation) eats RAM, causing refresh. Optimize with web workers or server-side processing.
3. **Backend Logs**: If using Node.js/Express, check server errors (e.g., API rate limits on Irys, insufficient funds for upload fees).
4. **Fix Suggestions**:
  - Add error handling: Wrap upload/mint in try-catch, show user-friendly messages (e.g., "File too large—try compressing").
  - Test with Limits: Enforce max file size (e.g., 50 MB) in UI validation.
  - Update SDKs: Ensure latest @irys/sdk and xrpl.js—bugs in older versions cause crashes.
  - Fallback: If Irys fails for large files, use direct Arweave chunking as per docs.