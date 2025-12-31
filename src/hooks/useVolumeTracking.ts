import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type VolumeSourceType = 
  | 'nft_sell' 
  | 'nft_buy' 
  | 'offer' 
  | 'listing' 
  | 'sticker' 
  | 'emote' 
  | 'emoji';

interface VolumeTrackingParams {
  sourceType: VolumeSourceType;
  volumeAmount: number;
  txHash: string;
  collectionId?: string;
  shopItemId?: string;
  userId?: string;
  chain?: string;
}

interface PoolStatus {
  pool_balance: number;
  accumulated_volume: number;
  buyback_threshold: number;
  progress_percent: number;
  total_buybacks_executed: number;
  last_buyback_at: string | null;
  can_execute_buyback: boolean;
}

interface VolumeStats {
  period: string;
  total_volume: number;
  total_weighted_volume: number;
  transaction_count: number;
  by_source: Record<string, { total: number; weighted: number; count: number }>;
}

interface TrackingResult {
  success: boolean;
  volume?: {
    volume_id: string;
    weighted_volume: number;
  };
  fee?: {
    fee_id: string;
    buyback_contribution: number;
  };
  total_volume?: number;
  platform_fee?: number;
  buyback_contribution?: number;
}

export const useVolumeTracking = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const trackTransaction = useCallback(async (params: VolumeTrackingParams): Promise<TrackingResult | null> => {
    setIsTracking(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('track-volume', {
        body: {
          action: 'record_transaction',
          data: {
            source_type: params.sourceType,
            volume_amount: params.volumeAmount,
            tx_hash: params.txHash,
            collection_id: params.collectionId,
            shop_item_id: params.shopItemId,
            user_id: params.userId,
            chain: params.chain || 'monad',
          },
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to track volume');
      }

      console.log('Volume tracked successfully:', data);
      return data as TrackingResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to track volume';
      setError(errorMessage);
      console.error('Error tracking volume:', err);
      return null;
    } finally {
      setIsTracking(false);
    }
  }, []);

  const trackVolume = useCallback(async (
    sourceType: VolumeSourceType,
    volumeAmount: number,
    txHash: string,
    collectionId?: string
  ): Promise<boolean> => {
    setIsTracking(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('track-volume', {
        body: {
          action: 'record_volume',
          data: {
            source_type: sourceType,
            volume_amount: volumeAmount,
            tx_hash: txHash,
            collection_id: collectionId,
          },
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      console.log('Volume recorded:', data);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to record volume';
      setError(errorMessage);
      console.error('Error recording volume:', err);
      return false;
    } finally {
      setIsTracking(false);
    }
  }, []);

  const getPoolStatus = useCallback(async (): Promise<PoolStatus | null> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('track-volume', {
        body: {
          action: 'get_pool_status',
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      return data as PoolStatus;
    } catch (err) {
      console.error('Error getting pool status:', err);
      return null;
    }
  }, []);

  const getVolumeStats = useCallback(async (period: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<VolumeStats | null> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('track-volume', {
        body: {
          action: 'get_volume_stats',
          data: { period },
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      return data as VolumeStats;
    } catch (err) {
      console.error('Error getting volume stats:', err);
      return null;
    }
  }, []);

  // Helper to track NFT mint with fee calculation
  const trackMint = useCallback(async (
    volumeAmount: number,
    txHash: string,
    collectionId: string,
    userId?: string
  ) => {
    return trackTransaction({
      sourceType: 'nft_buy',
      volumeAmount,
      txHash,
      collectionId,
      userId,
    });
  }, [trackTransaction]);

  // Helper to track NFT sale
  const trackSale = useCallback(async (
    volumeAmount: number,
    txHash: string,
    collectionId: string,
    userId?: string
  ) => {
    return trackTransaction({
      sourceType: 'nft_sell',
      volumeAmount,
      txHash,
      collectionId,
      userId,
    });
  }, [trackTransaction]);

  // Helper to track listing creation
  const trackListing = useCallback(async (
    volumeAmount: number,
    txHash: string,
    collectionId: string
  ) => {
    return trackTransaction({
      sourceType: 'listing',
      volumeAmount,
      txHash,
      collectionId,
    });
  }, [trackTransaction]);

  // Helper to track accepted offer
  const trackOffer = useCallback(async (
    volumeAmount: number,
    txHash: string,
    collectionId: string
  ) => {
    return trackTransaction({
      sourceType: 'offer',
      volumeAmount,
      txHash,
      collectionId,
    });
  }, [trackTransaction]);

  // Helper to track sticker pack purchase
  const trackStickerPurchase = useCallback(async (
    volumeAmount: number,
    txHash: string,
    shopItemId: string,
    userId?: string
  ) => {
    return trackTransaction({
      sourceType: 'sticker',
      volumeAmount,
      txHash,
      shopItemId,
      userId,
    });
  }, [trackTransaction]);

  // Helper to track emote pack purchase
  const trackEmotePurchase = useCallback(async (
    volumeAmount: number,
    txHash: string,
    shopItemId: string,
    userId?: string
  ) => {
    return trackTransaction({
      sourceType: 'emote',
      volumeAmount,
      txHash,
      shopItemId,
      userId,
    });
  }, [trackTransaction]);

  // Helper to track emoji pack purchase
  const trackEmojiPurchase = useCallback(async (
    volumeAmount: number,
    txHash: string,
    shopItemId: string,
    userId?: string
  ) => {
    return trackTransaction({
      sourceType: 'emoji',
      volumeAmount,
      txHash,
      shopItemId,
      userId,
    });
  }, [trackTransaction]);

  return {
    // State
    isTracking,
    error,
    
    // Core functions
    trackTransaction,
    trackVolume,
    getPoolStatus,
    getVolumeStats,
    
    // Helper functions for specific transaction types
    trackMint,
    trackSale,
    trackListing,
    trackOffer,
    trackStickerPurchase,
    trackEmotePurchase,
    trackEmojiPurchase,
  };
};

export default useVolumeTracking;
