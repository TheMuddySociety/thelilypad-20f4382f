import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface StickerContent {
  id: string;
  file_url: string;
  name: string;
  display_order: number;
}

interface ShopItem {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
  shop_item_contents: StickerContent[];
}

interface PurchasedPack {
  itemId: string;
  name: string;
  category: 'sticker_pack' | 'emoji_pack';
  coverImage: string | null;
  contents: StickerContent[];
}

interface UsePurchasedStickersResult {
  stickerPacks: PurchasedPack[];
  emojiPacks: PurchasedPack[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const usePurchasedStickers = (userId: string | null): UsePurchasedStickersResult => {
  const [stickerPacks, setStickerPacks] = useState<PurchasedPack[]>([]);
  const [emojiPacks, setEmojiPacks] = useState<PurchasedPack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPurchasedPacks = async () => {
    if (!userId) {
      setStickerPacks([]);
      setEmojiPacks([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch user's purchased items with their contents
      const { data: purchases, error: purchaseError } = await supabase
        .from('shop_purchases')
        .select(`
          item_id,
          shop_items!inner (
            id,
            name,
            category,
            image_url,
            shop_item_contents (
              id,
              file_url,
              name,
              display_order
            )
          )
        `)
        .eq('user_id', userId);

      if (purchaseError) throw purchaseError;

      const stickers: PurchasedPack[] = [];
      const emojis: PurchasedPack[] = [];

      purchases?.forEach((purchase) => {
        const item = purchase.shop_items as unknown as ShopItem;
        if (!item) return;

        const pack: PurchasedPack = {
          itemId: item.id,
          name: item.name,
          category: item.category as 'sticker_pack' | 'emoji_pack',
          coverImage: item.image_url,
          contents: (item.shop_item_contents || []).sort(
            (a, b) => a.display_order - b.display_order
          ),
        };

        if (item.category === 'sticker_pack') {
          stickers.push(pack);
        } else if (item.category === 'emoji_pack') {
          emojis.push(pack);
        }
      });

      setStickerPacks(stickers);
      setEmojiPacks(emojis);
    } catch (err) {
      console.error('Error fetching purchased stickers:', err);
      setError('Failed to load stickers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchasedPacks();
  }, [userId]);

  return {
    stickerPacks,
    emojiPacks,
    isLoading,
    error,
    refetch: fetchPurchasedPacks,
  };
};
