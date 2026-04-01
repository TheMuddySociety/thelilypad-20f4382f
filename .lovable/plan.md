

# Audit and Smart Contract Plan for The Lily Pad

This plan covers: fixing build errors, auditing Irys/Arweave, hiding XRPL features, and creating smart contract architecture for Solana and Monad across Launchpad, Buyback, Shop items, and Creator/Streamer systems.

---

## Phase 1: Fix Build Errors (prerequisite)

Five files have TypeScript errors from untyped Supabase query results:

1. **StreakLeaderboard.tsx (line 195)** — `entry.displayName` returns `unknown` as `ReactNode`. Add type assertion to the query result mapping.
2. **VolumeLeaderboard.tsx (lines 74-75)** — `profileMap.get()` returns `unknown`. Type the profiles query result with `{ user_id: string; display_name: string; avatar_url: string }`.
3. **RewardDistributionHistory.tsx (lines 144-145)** — Same pattern. Add type annotation to profiles query.
4. **RewardsAllocationManager.tsx (lines 123-124)** — Same pattern. Add type annotation.
5. **Following.tsx (line 315)** — `streamerIds` is `unknown[]` but `fetchRecommendedStreamers` expects `string[]`. Cast `follows?.map((f: any) => f.streamer_id as string)`.

---

## Phase 2: Irys/Arweave Audit

**Current state** — `src/chains/solana/metadata.ts` uses `umi.uploader` (Irys via `irysUploader()` plugin) for file and JSON uploads. `src/chains/solana/client.ts` correctly registers `.use(irysUploader())`.

**Findings & fixes:**

- **GenericFile shape** — The current `uploadFile`/`uploadFiles` functions manually construct `GenericFile` objects. These should use `createGenericFile` from `@metaplex-foundation/umi` for correctness and forward compatibility.
- **Error handling** — No try/catch or retry logic on uploads. Add retry with exponential backoff (matching the pattern in `programs.ts`).
- **Monad NFTs** — Monad uses EVM, not Metaplex. Metadata for Monad NFTs should be uploaded to Irys independently via the `@irys/web-upload` SDK (already a dependency per `test_irys.ts`). Create `src/chains/monad/metadata.ts` with Irys upload functions for EVM-compatible metadata (ERC-721 standard JSON).
- **Batch size** — Current batch size of 10 is reasonable; no change needed.

---

## Phase 3: Hide XRPL Features

XRPL features should be hidden from the UI until ready for release. Changes:

1. **Launchpad.tsx** — Filter out tiles with `chains: ["xrpl"]` only (keep tiles that also support solana/monad). Remove the `easy-xrp` and `art-generator` tiles (XRPL-only). Keep `generative` but remove `"xrpl"` from its chains array.
2. **Marketplace.tsx** — Remove the XRPL chain filter tab from the chain selector.
3. **App.tsx** — Comment out or remove routes for `/launchpad/easy-xrp` and `/launchpad/xrpl-generator`.
4. **ArtGenerator.tsx** — Remove the "Easy XRP Generator" CTA button and reference.
5. **Add a feature flag** — Create `src/config/featureFlags.ts` with `XRPL_ENABLED = false` so these can be toggled back on easily.

---

## Phase 4: Smart Contracts — Solana Launchpad

**Current state**: Already has production-ready Metaplex Core Candy Machine integration with guard groups, protocol memos, retry logic, and fee splitting. This is solid.

**Enhancements:**

- **Buyback contract integration** — Create `src/chains/solana/buyback.ts`:
  - `executeBuyback(umi, tokenMint, amount)` — SOL→Token swap via treasury
  - `getBuybackPoolBalance(umi)` — Read pool state
  - Uses SPL Token swap or Jupiter aggregator API for on-chain swaps
  - Protocol memo: `TheLilyPad:v1:buyback:execute`

- **Shop contracts** — Create `src/chains/solana/shop.ts`:
  - `purchaseStickerPack(umi, packId, price, creatorWallet)` — SOL transfer with fee split + protocol memo
  - `purchaseEmotePack(umi, packId, price, creatorWallet)` — Same pattern for emotes
  - `purchaseEmojiPack(umi, packId, price, creatorWallet)` — Same for emoji packs
  - `purchaseLootBox(umi, boxId, price, creatorWallet)` — With randomized reveal logic
  - All use `TREASURY_CONFIG.fees.shop` for fee calculation
  - All include protocol memos (`shop:sticker_pack`, `shop:emote_pack`, `shop:emoji_pack`, `shop:blind_box`)

- **Creator/Streamer contracts** — Create `src/chains/solana/creator.ts`:
  - `tipCreator(umi, creatorWallet, amount)` — Direct SOL transfer (0% platform fee per config)
  - `registerCreatorOnChain(umi, metadata)` — Memo-tagged identity registration
  - Protocol memos: `tip:creator`, `creator:register`

- **Update ProtocolAction types** — Add new actions to `src/lib/solanaProtocol.ts`:
  - `'buyback:execute'`, `'shop:emote_pack'`, `'shop:emoji_pack'`, `'creator:register'`

---

## Phase 5: Smart Contracts — Monad Launchpad

**Current state**: `src/chains/monad/contracts.ts` has mock deployment and basic `batchMint` via viem. The ABI is minimal.

**Enhancements:**

- **Real Factory Contract** — Create `src/chains/monad/abi/Factory.ts`:
  - Full ERC-721A factory ABI for deploying collections
  - Includes: `createCollection(name, symbol, baseURI, maxSupply, mintPrice, royaltyBPS)`
  - Returns deployed contract address

- **Enhanced ERC-721A ABI** — Update `src/chains/monad/abi/ERC721.ts`:
  - Add `totalSupply`, `maxSupply`, `mintPrice`, `setBaseURI`, `withdraw`, `setMintPrice`, `setPhase`, `ownerOf`, `balanceOf`
  - Add phase-based minting: `mintPhase(quantity, phaseId, proof[])`

- **Buyback on Monad** — Create `src/chains/monad/buyback.ts`:
  - `executeMonadBuyback(contractAddress, amount)` — ERC-20 swap via DEX router
  - ABI for Uniswap V2/V3 style router

- **Shop on Monad** — Create `src/chains/monad/shop.ts`:
  - Payment splitter contract interactions for sticker/emote/emoji/lootbox purchases
  - Uses viem `writeContract` with a PaymentSplitter ABI

- **Monad Metadata** — Create `src/chains/monad/metadata.ts`:
  - Upload to Irys using `@irys/web-upload` for EVM-compatible JSON (name, description, image, attributes)

- **Update contracts.ts** — Replace mock deployment with real factory contract calls.

---

## Phase 6: Update Chain Index

Update `src/chains/index.ts` to re-export all new modules:
- `executeBuyback`, `purchaseStickerPack`, `purchaseEmotePack`, `purchaseEmojiPack`, `purchaseLootBox`, `tipCreator`
- Monad equivalents

---

## Technical Details

**File changes summary:**

| File | Action |
|------|--------|
| `src/components/StreakLeaderboard.tsx` | Fix type assertion |
| `src/components/VolumeLeaderboard.tsx` | Fix profile map typing |
| `src/components/admin/RewardDistributionHistory.tsx` | Fix profile map typing |
| `src/components/admin/RewardsAllocationManager.tsx` | Fix profile map typing |
| `src/pages/Following.tsx` | Fix streamerIds type cast |
| `src/config/featureFlags.ts` | New — XRPL_ENABLED flag |
| `src/pages/Launchpad.tsx` | Hide XRPL tiles |
| `src/pages/Marketplace.tsx` | Hide XRPL filter |
| `src/App.tsx` | Conditionally hide XRPL routes |
| `src/pages/ArtGenerator.tsx` | Remove XRPL CTA |
| `src/chains/solana/metadata.ts` | Audit fixes (createGenericFile, retry) |
| `src/chains/monad/metadata.ts` | New — Irys uploads for EVM |
| `src/chains/solana/buyback.ts` | New — Buyback pool operations |
| `src/chains/solana/shop.ts` | New — Shop purchase transactions |
| `src/chains/solana/creator.ts` | New — Creator/streamer on-chain ops |
| `src/chains/monad/abi/Factory.ts` | New — ERC-721A factory ABI |
| `src/chains/monad/abi/ERC721.ts` | Enhanced with full minting ABI |
| `src/chains/monad/buyback.ts` | New — Monad buyback |
| `src/chains/monad/shop.ts` | New — Monad shop payments |
| `src/chains/monad/contracts.ts` | Replace mocks with factory calls |
| `src/lib/solanaProtocol.ts` | Add new ProtocolAction types |
| `src/chains/index.ts` | Re-export new modules |

