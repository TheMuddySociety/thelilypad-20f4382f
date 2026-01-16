import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWallet } from '@/providers/WalletProvider';

const ADMIN_WALLET_ADDRESS = "Cra8LAvpQAk3hx4By5STHp4xrq7HSAnZLk4Jwzv1wUAH";

export const useIsAdmin = () => {
  const { address, isConnected } = useWallet();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      // 1. Check Wallet Address first
      if (isConnected && address === ADMIN_WALLET_ADDRESS) {
        setIsAdmin(true);
        setLoading(false);
        return;
      }

      // 2. Fallback to Supabase Email/Auth check
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          // If no wallet match and no user session, not admin
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(!!data);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAdminStatus();
    });

    return () => subscription.unsubscribe();
  }, [isConnected, address]); // Re-run when wallet state changes

  return { isAdmin, loading };
};
