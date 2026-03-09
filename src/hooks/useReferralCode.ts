import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'LP-';
  for (let i = 0; i < 6; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

export function useReferralCode() {
  const { walletAddress, profile } = useAuth();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.user_id) return;

    const init = async () => {
      setLoading(true);
      try {
        // Get or create referral code
        const { data: existing } = await supabase
          .from('referral_codes')
          .select('code')
          .eq('user_id', profile.user_id)
          .maybeSingle();

        if (existing) {
          setReferralCode(existing.code);
        } else {
          const code = generateCode();
          const { data: created } = await (supabase.from('referral_codes') as any)
            .insert({ user_id: profile.user_id, code })
            .select('code')
            .single();
          if (created) setReferralCode(created.code);
        }

        // Get referral count
        const { count } = await supabase
          .from('referral_signups')
          .select('*', { count: 'exact', head: true })
          .eq('referrer_id', profile.user_id);
        
        setReferralCount(count || 0);
      } catch (e) {
        console.error('Referral code error:', e);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [profile?.user_id]);

  return { referralCode, referralCount, loading };
}
