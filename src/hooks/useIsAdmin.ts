import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWallet } from '@/providers/WalletProvider';

export const useIsAdmin = () => {
  const { address, isConnected } = useWallet();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Hardcoded admin addresses for emergency/developer access
  const HARDCODED_ADMINS = [
    'Cra8LAvpQAk3hx4By5STHp4xrq7HSAnZLk4Jwzv1wUAH'
  ];

  useEffect(() => {
    const checkAdminStatus = async () => {
      // 1. First check hardcoded addresses
      if (address && HARDCODED_ADMINS.includes(address)) {
        setIsAdmin(true);
        setLoading(false);
        return;
      }

      // 2. Then check Supabase user_roles table for admin role
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          // If no user session, not admin
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
