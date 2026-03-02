---
description: Core project context and agent behavior rules for The Lily Pad
---

# The Lily Pad — Agent Context

## What This Project Is
Multi-chain NFT Launchpad & Marketplace on Solana, XRPL, and Monad.
- Read `PROJECT_MEMORY.md` at the project root for full context.
- Owner: ILLRe

## Agent Behavior Rules

1. **Always read PROJECT_MEMORY.md first** on a new session before writing any code.
2. **Prefer editing existing files** over creating new ones when adding features.
3. **XRPL patterns to always follow:**
   - Use `convertStringToHex` never `Buffer.from`
   - Always check `tesSUCCESS` after `submitAndWait`
   - Extract NFTokenID via `safeExtractNFTokenId(result.result.meta)`
   - Store NFTokenID as full 64-char hex string, never parseInt
4. **Storage routing:**
   - Images/metadata → `storageClient` (VITE_STORAGE_SUPABASE_*)
   - App data → `supabase` (VITE_SUPABASE_*)
   - IPFS pinning → admin-only, via Pinata JWT
5. **Toast IDs** — reuse existing ones: `'easy-mint'`, `'xrpl-mint'`, `'xrpl-deploy'`, `'zip-download'`
6. **Always run** `npx tsc --noEmit` after XRPL/chain changes and confirm 0 errors.
7. **Dev server** runs on port 5173 (`npx vite --port 5173`), NOT 8080.
8. **After any code change**, update `PROJECT_MEMORY.md` Section 6 (Completed Work Log).

## Files NOT to Touch Without Understanding Context
- `src/providers/WalletProvider.tsx` — complex multi-chain state machine
- `src/providers/AuthProvider.tsx` — careful with state transitions
- `src/integrations/supabase/client.ts` — do not confuse with storageClient
- `src/chains/xrpl/BattleService.ts` — intentionally a placeholder, warn user before using

## Current Sprint Focus
- Creator Beta Program (application form + admin approvals + Jitsi rooms)
- XRPL Marketplace live listings
