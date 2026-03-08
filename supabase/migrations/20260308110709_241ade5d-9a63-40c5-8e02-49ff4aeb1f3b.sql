
-- 1) Platform stats: total collections, live streams, minted NFTs, total sold volume
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'totalCollections', (SELECT COUNT(*)::int FROM public.collections WHERE deleted_at IS NULL),
    'liveNow',          (SELECT COUNT(*)::int FROM public.streams WHERE is_live = true),
    'nftsMinted',       (SELECT COUNT(*)::int FROM public.minted_nfts),
    'totalVolume',      (SELECT COALESCE(SUM(price), 0) FROM public.nft_listings WHERE status = 'sold')
  );
$$;

-- 2) Launchpad stats: total collections, live collections, minted NFTs, total sold volume
CREATE OR REPLACE FUNCTION public.get_launchpad_stats()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'totalCollections', (SELECT COUNT(*)::int FROM public.collections WHERE deleted_at IS NULL),
    'liveNow',          (SELECT COUNT(*)::int FROM public.collections WHERE status = 'live' AND deleted_at IS NULL),
    'nftsMinted',       (SELECT COUNT(*)::int FROM public.minted_nfts),
    'totalVolume',      (SELECT COALESCE(SUM(price), 0) FROM public.nft_listings WHERE status = 'sold')
  );
$$;

-- 3) Top collections stats: top 3 per category (volume, trades, unique sellers, unique buyers)
CREATE OR REPLACE FUNCTION public.get_top_collections_stats()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH sold AS (
    SELECT
      mn.collection_id,
      l.price,
      l.seller_id,
      l.buyer_id
    FROM public.nft_listings l
    JOIN public.minted_nfts mn ON mn.id = l.nft_id
    WHERE l.status = 'sold'
      AND mn.collection_id IS NOT NULL
  ),
  agg AS (
    SELECT
      s.collection_id,
      COALESCE(SUM(s.price), 0) AS volume,
      COUNT(*)::int AS trades,
      COUNT(DISTINCT s.seller_id)::int AS unique_sellers,
      COUNT(DISTINCT s.buyer_id)::int AS unique_buyers
    FROM sold s
    GROUP BY s.collection_id
  ),
  ranked AS (
    SELECT
      a.*,
      c.name,
      c.image_url,
      c.symbol
    FROM agg a
    JOIN public.collections c ON c.id = a.collection_id AND c.deleted_at IS NULL
  ),
  by_volume AS (
    SELECT json_agg(row_to_json(t)) AS data FROM (
      SELECT collection_id AS id, name, image_url, symbol, volume AS value
      FROM ranked ORDER BY volume DESC LIMIT 3
    ) t
  ),
  by_trades AS (
    SELECT json_agg(row_to_json(t)) AS data FROM (
      SELECT collection_id AS id, name, image_url, symbol, trades AS value
      FROM ranked ORDER BY trades DESC LIMIT 3
    ) t
  ),
  by_sells AS (
    SELECT json_agg(row_to_json(t)) AS data FROM (
      SELECT collection_id AS id, name, image_url, symbol, unique_sellers AS value
      FROM ranked ORDER BY unique_sellers DESC LIMIT 3
    ) t
  ),
  by_buys AS (
    SELECT json_agg(row_to_json(t)) AS data FROM (
      SELECT collection_id AS id, name, image_url, symbol, unique_buyers AS value
      FROM ranked ORDER BY unique_buyers DESC LIMIT 3
    ) t
  )
  SELECT json_build_object(
    'byVolume', COALESCE((SELECT data FROM by_volume), '[]'::json),
    'byTrades', COALESCE((SELECT data FROM by_trades), '[]'::json),
    'bySells',  COALESCE((SELECT data FROM by_sells), '[]'::json),
    'byBuys',   COALESCE((SELECT data FROM by_buys), '[]'::json)
  );
$$;
