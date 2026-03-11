import { useState, useCallback } from 'react';
import { useWallet } from '@/providers/WalletProvider';
import { sendXRP, loadXRPLWallet, getXRPLNetwork } from '@/lib/xrpl-wallet';
import { toast } from 'sonner';

export function useXRPLPayment() {
    const [isProcessing, setIsProcessing] = useState(false);

    const sendPayment = useCallback(async (amount: string, destination: string) => {
        setIsProcessing(true);
        try {
            const wallet = await loadXRPLWallet();
            if (!wallet) {
                toast.error("XRPL wallet not found. Please connect your wallet.");
                return { success: false };
            }

            const network = getXRPLNetwork();
            const result = await sendXRP(wallet.seed, destination, amount, network);
            
            if (result.success) {
                toast.success("XRP payment successful!");
                return { success: true, hash: result.hash };
            } else {
                toast.error(result.error || "XRP payment failed");
                return { success: false, error: result.error };
            }
        } catch (error: any) {
            console.error("XRPL Payment error:", error);
            toast.error(error.message || "XRP payment failed");
            return { success: false, error: error.message };
        } finally {
            setIsProcessing(false);
        }
    }, []);

    return {
        sendPayment,
        isProcessing
    };
}
