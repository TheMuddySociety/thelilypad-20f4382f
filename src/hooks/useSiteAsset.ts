import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SiteAsset {
  id: string;
  asset_key: string;
  asset_url: string;
  asset_type: string;
  page: string | null;
  description: string | null;
  created_at?: string;
  updated_at?: string;
}

interface UseSiteAssetResult {
  assetUrl: string | null;
  loading: boolean;
  error: Error | null;
}

// In-memory cache to avoid repeated queries
const assetCache: Map<string, string> = new Map();

export function useSiteAsset(assetKey: string, fallbackUrl?: string): UseSiteAssetResult {
  const [assetUrl, setAssetUrl] = useState<string | null>(assetCache.get(assetKey) || null);
  const [loading, setLoading] = useState(!assetCache.has(assetKey));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // If already cached, no need to fetch
    if (assetCache.has(assetKey)) {
      setAssetUrl(assetCache.get(assetKey) || null);
      setLoading(false);
      return;
    }

    const fetchAsset = async () => {
      try {
        setLoading(true);
        // Use type assertion since site_assets table may not be in generated types yet
        const { data, error: fetchError } = await (supabase
          .from('site_assets' as any)
          .select('asset_url')
          .eq('asset_key', assetKey)
          .maybeSingle()) as { data: { asset_url: string } | null; error: any };

        if (fetchError) {
          throw fetchError;
        }

        const url = data?.asset_url || fallbackUrl || null;
        if (url) {
          assetCache.set(assetKey, url);
        }
        setAssetUrl(url);
      } catch (err) {
        console.error(`Error fetching site asset '${assetKey}':`, err);
        setError(err instanceof Error ? err : new Error('Failed to fetch asset'));
        // Use fallback on error
        if (fallbackUrl) {
          setAssetUrl(fallbackUrl);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAsset();
  }, [assetKey, fallbackUrl]);

  return { assetUrl: assetUrl || fallbackUrl || null, loading, error };
}

// Hook to fetch all site assets (for admin)
export function useSiteAssets() {
  const [assets, setAssets] = useState<SiteAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      // Use type assertion since site_assets table may not be in generated types yet
      const { data, error: fetchError } = await (supabase
        .from('site_assets' as any)
        .select('*')
        .order('asset_key')) as { data: SiteAsset[] | null; error: any };

      if (fetchError) throw fetchError;
      setAssets(data || []);
    } catch (err) {
      console.error('Error fetching site assets:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch assets'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const addAsset = async (asset: Omit<SiteAsset, 'id'>) => {
    const { data, error } = await (supabase
      .from('site_assets' as any)
      .insert(asset)
      .select()
      .single()) as { data: SiteAsset | null; error: any };

    if (error) throw error;
    if (!data) throw new Error('No data returned');
    
    // Update cache and state
    assetCache.set(asset.asset_key, asset.asset_url);
    setAssets(prev => [...prev, data]);
    return data;
  };

  const updateAsset = async (id: string, updates: Partial<SiteAsset>) => {
    const { data, error } = await (supabase
      .from('site_assets' as any)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()) as { data: SiteAsset | null; error: any };

    if (error) throw error;
    if (!data) throw new Error('No data returned');
    
    // Update cache
    if (data.asset_key && data.asset_url) {
      assetCache.set(data.asset_key, data.asset_url);
    }
    setAssets(prev => prev.map(a => a.id === id ? data : a));
    return data;
  };

  const deleteAsset = async (id: string, assetKey: string) => {
    const { error } = await (supabase
      .from('site_assets' as any)
      .delete()
      .eq('id', id)) as { error: any };

    if (error) throw error;
    
    // Remove from cache
    assetCache.delete(assetKey);
    setAssets(prev => prev.filter(a => a.id !== id));
  };

  return { 
    assets, 
    loading, 
    error, 
    refetch: fetchAssets,
    addAsset,
    updateAsset,
    deleteAsset
  };
}

// Clear cache utility (useful when admin updates assets)
export function clearAssetCache() {
  assetCache.clear();
}
