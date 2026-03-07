-- Fast single-query stats aggregate functions for Launchpad and Platform
CREATE OR REPLACE FUNCTION get_launchpad_stats() RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE total_collections integer;
live_collections integer;
minted_nfts integer;
total_volume numeric;
BEGIN -- We can do this with 4 parallel independent scalar subqueries, but since it's an RPC it runs entirely on the server
SELECT count(*) INTO total_collections
FROM public.collections;
SELECT count(*) INTO live_collections
FROM public.collections
WHERE status = 'live';
SELECT count(*) INTO minted_nfts
FROM public.minted_nfts;
SELECT COALESCE(sum(price), 0) INTO total_volume
FROM public.nft_listings
WHERE status = 'sold';
RETURN json_build_object(
    'totalCollections',
    total_collections,
    'liveNow',
    live_collections,
    'nftsMinted',
    minted_nfts,
    'totalVolume',
    total_volume
);
END;
$$;
CREATE OR REPLACE FUNCTION get_platform_stats() RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE total_collections integer;
live_streams integer;
minted_nfts integer;
total_volume numeric;
BEGIN
SELECT count(*) INTO total_collections
FROM public.collections;
SELECT count(*) INTO live_streams
FROM public.streams
WHERE is_live = true;
SELECT count(*) INTO minted_nfts
FROM public.minted_nfts;
SELECT COALESCE(sum(price), 0) INTO total_volume
FROM public.nft_listings
WHERE status = 'sold';
RETURN json_build_object(
    'totalCollections',
    total_collections,
    'liveNow',
    live_streams,
    'nftsMinted',
    minted_nfts,
    'totalVolume',
    total_volume
);
END;
$$;
CREATE OR REPLACE FUNCTION get_dashboard_analytics(target_user_id uuid) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE viewer_data json;
earnings_data json;
recent_streams json;
recent_donations json;
BEGIN -- 1. Viewer data (last 7 days average per day)
SELECT COALESCE(
        json_agg(
            json_build_object(
                'date',
                to_char(d.day, 'Dy'),
                'viewers',
                COALESCE(v.avg_viewers, 0)
            )
        ),
        '[]'::json
    ) INTO viewer_data
FROM (
        SELECT generate_series(
                date_trunc('day', now() - interval '6 days'),
                date_trunc('day', now()),
                '1 day'::interval
            ) AS day
    ) d
    LEFT JOIN (
        SELECT date_trunc('day', recorded_at) AS day,
            ROUND(AVG(concurrent_viewers)) AS avg_viewers
        FROM public.stream_analytics
        WHERE user_id = target_user_id
            AND recorded_at >= now() - interval '7 days'
        GROUP BY 1
    ) v ON d.day = v.day;
-- 2. Earnings data (months of the current year)
SELECT COALESCE(
        json_agg(
            json_build_object(
                'date',
                to_char(m.month, 'Mon'),
                'amount',
                COALESCE(e.total_amount, 0)
            )
        ),
        '[]'::json
    ) INTO earnings_data
FROM (
        SELECT generate_series(
                date_trunc('year', now()),
                date_trunc('month', now()),
                '1 month'::interval
            ) AS month
    ) m
    LEFT JOIN (
        SELECT date_trunc('month', created_at) AS month,
            SUM(amount) AS total_amount
        FROM public.earnings
        WHERE user_id = target_user_id
            AND created_at >= date_trunc('year', now())
        GROUP BY 1
    ) e ON m.month = e.month;
-- 3. Recent streams
SELECT COALESCE(
        json_agg(
            json_build_object(
                'id',
                id,
                'title',
                title,
                'category',
                category,
                'viewers',
                peak_viewers,
                'duration_seconds',
                duration_seconds,
                'ended_at',
                ended_at,
                'created_at',
                created_at
            )
        ),
        '[]'::json
    ) INTO recent_streams
FROM (
        SELECT id,
            COALESCE(title, 'Untitled Stream') as title,
            category,
            COALESCE(peak_viewers, 0) as peak_viewers,
            duration_seconds,
            ended_at,
            created_at
        FROM public.streams
        WHERE user_id = target_user_id
        ORDER BY created_at DESC
        LIMIT 5
    ) s;
-- 4. Recent donations
SELECT COALESCE(
        json_agg(
            json_build_object(
                'id',
                id,
                'from',
                COALESCE(from_username, 'Anonymous'),
                'amount',
                amount,
                'message',
                message,
                'created_at',
                created_at
            )
        ),
        '[]'::json
    ) INTO recent_donations
FROM (
        SELECT id,
            from_username,
            amount,
            message,
            created_at
        FROM public.earnings
        WHERE user_id = target_user_id
            AND type = 'tip'
        ORDER BY created_at DESC
        LIMIT 5
    ) d;
RETURN json_build_object(
    'viewerData',
    viewer_data,
    'earningsData',
    earnings_data,
    'recentStreams',
    recent_streams,
    'recentDonations',
    recent_donations
);
END;
$$;