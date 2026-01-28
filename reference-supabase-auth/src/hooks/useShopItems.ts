'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/auth-provider';
import { toast } from 'sonner';

export type ShopItemCategory = 'sticker_pack' | 'emoji_pack' | 'blind_box';

export interface ShopItem {
    id: string;
    owner_id: string;
    name: string;
    description: string | null;
    category: ShopItemCategory;
    price: number;
    image_url: string | null;
    metadata_uri: string | null;
    is_active: boolean;
    created_at: string;
}

export interface CreateShopItemInput {
    name: string;
    description?: string;
    category: ShopItemCategory;
    price: number;
    image_url?: string;
}

export function useShopItems() {
    const { user } = useAuth();
    const [items, setItems] = useState<ShopItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchItems = useCallback(async () => {
        if (!user) {
            setItems([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
            .from('shop_items')
            .select('*')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false });

        if (fetchError) {
            console.error('Error fetching shop items:', fetchError);
            setError(fetchError.message);
            toast.error('Failed to load your items.');
        } else {
            setItems(data || []);
        }

        setLoading(false);
    }, [user]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const createItem = async (input: CreateShopItemInput): Promise<ShopItem | null> => {
        if (!user) {
            toast.error('You must be signed in to create items.');
            return null;
        }

        const { data, error: createError } = await supabase
            .from('shop_items')
            .insert({
                owner_id: user.id,
                name: input.name,
                description: input.description || null,
                category: input.category,
                price: input.price,
                image_url: input.image_url || null,
                is_active: true,
            })
            .select()
            .single();

        if (createError) {
            console.error('Error creating shop item:', createError);
            toast.error('Failed to create item: ' + createError.message);
            return null;
        }

        toast.success(`${input.category.replace('_', ' ')} "${input.name}" created!`);
        setItems((prev) => [data, ...prev]);
        return data;
    };

    const deleteItem = async (itemId: string): Promise<boolean> => {
        if (!user) {
            toast.error('You must be signed in.');
            return false;
        }

        const { error: deleteError } = await supabase
            .from('shop_items')
            .delete()
            .eq('id', itemId)
            .eq('owner_id', user.id); // Ensure they own it

        if (deleteError) {
            console.error('Error deleting shop item:', deleteError);
            toast.error('Failed to delete item: ' + deleteError.message);
            return false;
        }

        toast.success('Item deleted.');
        setItems((prev) => prev.filter((item) => item.id !== itemId));
        return true;
    };

    const toggleActive = async (itemId: string, isActive: boolean): Promise<boolean> => {
        if (!user) return false;

        const { error: updateError } = await supabase
            .from('shop_items')
            .update({ is_active: isActive })
            .eq('id', itemId)
            .eq('owner_id', user.id);

        if (updateError) {
            toast.error('Failed to update item.');
            return false;
        }

        toast.success(isActive ? 'Item is now active.' : 'Item is now hidden.');
        setItems((prev) =>
            prev.map((item) => (item.id === itemId ? { ...item, is_active: isActive } : item))
        );
        return true;
    };

    return {
        items,
        loading,
        error,
        refetch: fetchItems,
        createItem,
        deleteItem,
        toggleActive,
    };
}
