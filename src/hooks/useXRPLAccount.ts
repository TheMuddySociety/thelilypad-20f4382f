import { useState, useCallback } from 'react';
import { Wallet, convertStringToHex, convertHexToString } from 'xrpl';
import { useXRPLClient } from './useXRPLClient';
import { XRPLNetwork, DEFAULT_XRPL_NETWORK } from '@/config/xrpl';
import { toast } from 'sonner';

interface AccountSettings {
    domain: string | null;
    emailHash: string | null;
    transferRate: number | null; // 0 means no fee
}

/**
 * Hook for managing XRPL Account settings (Domain, EmailHash, etc.)
 */
export function useXRPLAccount(network: XRPLNetwork = DEFAULT_XRPL_NETWORK) {
    const { getClient, submitTransaction } = useXRPLClient(network);
    const [isLoading, setIsLoading] = useState(false);
    const [settings, setSettings] = useState<AccountSettings | null>(null);

    /**
     * Fetch current account settings
     */
    const fetchAccountSettings = useCallback(async (address: string) => {
        setIsLoading(true);
        try {
            const client = await getClient();
            const response = await client.request({
                command: 'account_info',
                account: address,
                ledger_index: 'validated',
            });

            const data = response.result.account_data;

            setSettings({
                domain: data.Domain ? convertHexToString(data.Domain) : null,
                emailHash: data.EmailHash || null,
                transferRate: data.TransferRate || 0,
            });

            return response.result.account_data;
        } catch (error) {
            console.error('Failed to fetch account settings:', error);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [getClient]);

    /**
     * Set Account Domain
     */
    const setDomain = useCallback(async (
        wallet: Wallet,
        domain: string
    ): Promise<{ success: boolean; error?: string }> => {
        setIsLoading(true);
        try {
            toast.loading('Setting account domain...', { id: 'account-set' });

            // AccountSet transaction
            const tx = {
                TransactionType: 'AccountSet' as const,
                Account: wallet.classicAddress,
                Domain: convertStringToHex(domain),
            };

            const result = await submitTransaction(tx, wallet);
            const txResult = result.result.meta?.TransactionResult;

            if (txResult !== 'tesSUCCESS') {
                throw new Error(`Transaction failed: ${txResult}`);
            }

            toast.success('Domain updated successfully!', { id: 'account-set' });

            // Refresh settings
            await fetchAccountSettings(wallet.classicAddress);

            return { success: true };

        } catch (error: any) {
            console.error('Set domain error:', error);
            toast.error('Failed to set domain', { id: 'account-set', description: error.message });
            return { success: false, error: error.message };
        } finally {
            setIsLoading(false);
        }
    }, [submitTransaction, fetchAccountSettings]);

    return {
        fetchAccountSettings,
        setDomain,
        settings,
        isLoading,
    };
}
