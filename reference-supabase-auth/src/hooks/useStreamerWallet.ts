import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface WalletResponse {
    wallet_address: string;
    display_name: string | null;
}

export const useStreamerWallet = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchWalletAddress = useCallback(async (streamerUserId: string): Promise<WalletResponse | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const { data, error: fnError } = await supabase.functions.invoke('get-streamer-wallet', {
                body: { streamer_user_id: streamerUserId },
            });

            if (fnError) {
                throw new Error(fnError.message);
            }

            if (data.error) {
                throw new Error(data.error);
            }

            return data as WalletResponse;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch wallet address';
            setError(errorMessage);
            console.error('Error fetching wallet address:', err);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        fetchWalletAddress,
        isLoading,
        error,
    };
};
