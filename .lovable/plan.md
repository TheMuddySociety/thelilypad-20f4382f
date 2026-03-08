

# Plan: Replace Client-Side Volume Aggregation with SQL Functions

## Problem
1. `useLaunchpadStats` and `usePlatformStats` call RPC functions (`get_launchpad_stats`, `get_platform_stats`) that **don't exist** in the database -- they silently fail and return zeros.
2. `TopCollectionsHighlights` fetches **all** sold listings client-side (capped at 1000 rows) and aggregates volume/trades/sellers/buyers in JavaScript -- broken at scale.
3. `useMarketplaceData` fetches all recent mints client-side to count "hot" collections -- also subject to the 1000-row limit.

## Plan

### Step 1: Create `get_platform_stats` DB function
A single SQL function returning all four stats in one query:
```sql
CREATE FUNCTION get_platform_stats()
RETURNS JSON AS $$
  SELECT json_build_object(
    'totalCollections', (SELECT COUNT(*) FROM collections),
    'liveNow', (SELECT COUNT(*) FROM streams WHERE is_live = true),
    'nftsMinted', (SELECT COUNT(*) FROM minted_nfts),
    'totalVolume', (SELECT COALESCE(SUM(price), 0) FROM nft_listings WHERE status = 'sold')
  )
$$ LANGUAGE sql STABLE;
```

### Step 2: Create `get_launchpad_stats` DB function
Same shape, scoped to launchpad context (no streams):
```sql
CREATE FUNCTION get_launchpad_stats()
RETURNS JSON AS $$
  SELECT json_build_object(
    'totalCollections', (SELECT COUNT(*) FROM collections),
    'liveNow', (SELECT COUNT(*) FROM collections WHERE status = 'live'),
    'nftsMinted', (SELECT COUNT(*) FROM minted_nfts),
    'totalVolume', (SELECT COALESCE(SUM(price), 0) FROM nft_listings WHERE status = 'sold')
  )
$$ LANGUAGE sql STABLE;
```

### Step 3: Create `get_top_collections_stats` DB function
Returns top 3 collections per category (volume, trades, unique sellers, unique buyers) using SQL aggregation instead of fetching all rows:
```sql
CREATE FUNCTION get_top_collections_stats()
RETURNS JSON ...
-- Uses GROUP BY + JOIN + ORDER BY + LIMIT 3 per category
-- All aggregation in SQL, no 1000-row cap
```

### Step 4: Update `usePlatformStats` and `useLaunchpadStats`
- Remove `as any` casts (functions will now exist in types after migration)
- Map the JSON response keys properly (the DB returns `totalCollections` etc.)
- Keep realtime subscriptions but they just re-invoke the single RPC call

### Step 5: Update `TopCollectionsHighlights`
- Replace the two client-side queries + JS aggregation loop with a single `supabase.rpc('get_top_collections_stats')` call
- Remove `collectionStats` accumulator, `Set` tracking, and manual sorting
- Map the RPC response directly to the component state

### Files Changed
- **Database migration**: Create 3 functions (`get_platform_stats`, `get_launchpad_stats`, `get_top_collections_stats`)
- `src/hooks/usePlatformStats.ts`: Update response key mapping, remove `as any`
- `src/hooks/useLaunchpadStats.ts`: Update response key mapping, remove `as any`
- `src/components/sections/TopCollectionsHighlights.tsx`: Replace client-side aggregation with RPC call

