import { useState, useCallback, useEffect, useRef } from 'react';
import { Client } from 'xrpl';
import { getXRPLUrl, XRPLNetwork, DEFAULT_XRPL_NETWORK } from '@/config/xrpl';

/**
 * Hook for managing XRPL client connection
 * Handles connection lifecycle and auto-reconnection
 */
export function useXRPLClient(network: XRPLNetwork = DEFAULT_XRPL_NETWORK) {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const clientRef = useRef<Client | null>(null);

    // Initialize client
    useEffect(() => {
        const url = getXRPLUrl(network);
        clientRef.current = new Client(url);

        // Handle connection events
        clientRef.current.on('connected', () => {
            setIsConnected(true);
            setIsConnecting(false);
            setError(null);
        });

        clientRef.current.on('disconnected', () => {
            setIsConnected(false);
        });

        clientRef.current.on('error', (err) => {
            setError(err.message || 'Connection error');
            setIsConnecting(false);
        });

        return () => {
            if (clientRef.current?.isConnected()) {
                clientRef.current.disconnect();
            }
        };
    }, [network]);

    /**
     * Connect to XRPL
     */
    const connect = useCallback(async () => {
        if (!clientRef.current) return;
        if (clientRef.current.isConnected()) return;

        setIsConnecting(true);
        setError(null);

        try {
            await clientRef.current.connect();
        } catch (err: any) {
            setError(err.message || 'Failed to connect');
            setIsConnecting(false);
        }
    }, []);

    /**
     * Disconnect from XRPL
     */
    const disconnect = useCallback(async () => {
        if (!clientRef.current) return;
        if (!clientRef.current.isConnected()) return;

        try {
            await clientRef.current.disconnect();
        } catch (err) {
            console.error('Disconnect error:', err);
        }
    }, []);

    /**
     * Get client instance (auto-connects if needed)
     */
    const getClient = useCallback(async (): Promise<Client> => {
        if (!clientRef.current) {
            throw new Error('XRPL client not initialized');
        }

        if (!clientRef.current.isConnected()) {
            await connect();
        }

        return clientRef.current;
    }, [connect]);

    /**
     * Get XRP balance for an address
     */
    const getBalance = useCallback(async (address: string): Promise<string> => {
        const client = await getClient();
        try {
            const balance = await client.getXrpBalance(address);
            return balance;
        } catch (err) {
            console.error('Failed to get balance:', err);
            return '0';
        }
    }, [getClient]);

    /**
     * Get account NFTs
     */
    const getAccountNFTs = useCallback(async (address: string) => {
        const client = await getClient();
        try {
            const response = await client.request({
                command: 'account_nfts',
                account: address,
            });
            return response.result.account_nfts || [];
        } catch (err) {
            console.error('Failed to get NFTs:', err);
            return [];
        }
    }, [getClient]);

    /**
     * Submit and wait for transaction
     */
    const submitTransaction = useCallback(async (
        transaction: any,
        wallet: any
    ) => {
        const client = await getClient();
        const result = await client.submitAndWait(transaction, { wallet });
        return result;
    }, [getClient]);

    return {
        client: clientRef.current,
        isConnected,
        isConnecting,
        error,
        connect,
        disconnect,
        getClient,
        getBalance,
        getAccountNFTs,
        submitTransaction,
        network,
    };
}
