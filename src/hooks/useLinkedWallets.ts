import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from './useUserProfile';
import { toast } from 'sonner';

export interface LinkedWallet {
  id: string;
  profile_id: string;
  wallet_address: string;
  chain: string;
  is_primary: boolean;
  label: string | null;
  linked_at: string;
}

export function useLinkedWallets() {
  const { profile } = useUserProfile();
  const [wallets, setWallets] = useState<LinkedWallet[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchWallets = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('linked_wallets')
        .select('*')
        .eq('profile_id', profile.id)
        .order('linked_at', { ascending: true });

      if (error) throw error;
      setWallets((data as LinkedWallet[]) || []);
    } catch (err) {
      console.error('Failed to fetch linked wallets:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  const linkWallet = async (walletAddress: string, chain: string, label?: string) => {
    if (!profile?.id) throw new Error('No profile');

    // Check duplicate
    const exists = wallets.some(
      w => w.wallet_address.toLowerCase() === walletAddress.toLowerCase() && w.chain === chain
    );
    if (exists) {
      toast.error('This wallet is already linked');
      return null;
    }

    const { data, error } = await supabase
      .from('linked_wallets')
      .insert({
        profile_id: profile.id,
        wallet_address: walletAddress,
        chain,
        label: label || null,
        is_primary: wallets.length === 0,
      })
      .select()
      .single();

    if (error) throw error;

    const wallet = data as LinkedWallet;
    setWallets(prev => [...prev, wallet]);
    toast.success('Wallet linked successfully');
    return wallet;
  };

  const unlinkWallet = async (walletId: string) => {
    const { error } = await supabase
      .from('linked_wallets')
      .delete()
      .eq('id', walletId);

    if (error) throw error;

    setWallets(prev => prev.filter(w => w.id !== walletId));
    toast.success('Wallet unlinked');
  };

  const setPrimary = async (walletId: string) => {
    if (!profile?.id) return;

    // Unset all, then set the chosen one
    await supabase
      .from('linked_wallets')
      .update({ is_primary: false } as Record<string, unknown>)
      .eq('profile_id', profile.id);

    await supabase
      .from('linked_wallets')
      .update({ is_primary: true } as Record<string, unknown>)
      .eq('id', walletId);

    setWallets(prev =>
      prev.map(w => ({ ...w, is_primary: w.id === walletId }))
    );
    toast.success('Primary wallet updated');
  };

  return { wallets, loading, linkWallet, unlinkWallet, setPrimary, refresh: fetchWallets };
}
