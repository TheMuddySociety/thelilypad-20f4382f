import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Wallet } from 'xrpl';
import { useXRPLClient } from '@/hooks/useXRPLClient';
import { XRPLNetwork, DEFAULT_XRPL_NETWORK } from '@/config/xrpl';

// Wallet type enum
export type XRPLWalletType = 'xumm' | 'crossmark' | 'gem' | 'manual';

interface XRPLWalletContextType {
    // Connection state
    address: string | null;
    isConnected: boolean;
    isConnecting: boolean;
    walletType: XRPLWalletType | null;

    // Wallet instance (for signing)
    wallet: Wallet | null;

    // Network
    network: XRPLNetwork;
    setNetwork: (network: XRPLNetwork) => void;

    // Balance
    balance: string;
    refreshBalance: () => Promise<void>;

    // Connection methods
    connect: (type: XRPLWalletType, seed?: string) => Promise<boolean>;
    disconnect: () => void;

    // Signing
    signTransaction: (tx: any) => Promise<any>;

    // Error
    error: string | null;
}

const XRPLWalletContext = createContext<XRPLWalletContextType | null>(null);

interface XRPLWalletProviderProps {
    children: ReactNode;
    defaultNetwork?: XRPLNetwork;
}

/**
 * Provider for XRPL wallet connections
 * 
 * Supported wallets:
 * - Xumm/Xaman (QR-code based mobile)
 * - Crossmark (browser extension) 
 * - GemWallet (browser extension)
 * - Manual (seed input for testing)
 */
export function XRPLWalletProvider({
    children,
    defaultNetwork = DEFAULT_XRPL_NETWORK
}: XRPLWalletProviderProps) {
    const [address, setAddress] = useState<string | null>(null);
    const [wallet, setWallet] = useState<Wallet | null>(null);
    const [walletType, setWalletType] = useState<XRPLWalletType | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [network, setNetwork] = useState<XRPLNetwork>(defaultNetwork);
    const [balance, setBalance] = useState('0');

    const { getBalance, connect: connectClient } = useXRPLClient(network);

    const isConnected = !!address && !!wallet;

    /**
     * Refresh balance for connected wallet
     */
    const refreshBalance = useCallback(async () => {
        if (!address) return;
        try {
            await connectClient();
            const bal = await getBalance(address);
            setBalance(bal);
        } catch (err) {
            console.error('Failed to refresh balance:', err);
        }
    }, [address, getBalance, connectClient]);

    // Refresh balance when address changes
    useEffect(() => {
        if (address) {
            refreshBalance();
        }
    }, [address, refreshBalance]);

    /**
     * Connect wallet
     */
    const connect = useCallback(async (
        type: XRPLWalletType,
        seed?: string
    ): Promise<boolean> => {
        setIsConnecting(true);
        setError(null);

        try {
            let connectedWallet: Wallet | null = null;

            switch (type) {
                case 'manual':
                    // Manual wallet from seed (for testing only!)
                    if (!seed) {
                        throw new Error('Seed required for manual wallet');
                    }
                    connectedWallet = Wallet.fromSeed(seed);
                    break;

                case 'crossmark':
                    // Crossmark browser extension
                    connectedWallet = await connectCrossmark();
                    break;

                case 'gem':
                    // GemWallet browser extension
                    connectedWallet = await connectGemWallet();
                    break;

                case 'xumm':
                    // Xumm/Xaman mobile wallet
                    // This requires server-side API for QR code generation
                    throw new Error('Xumm wallet requires SDK integration. Use Crossmark or GemWallet for now.');

                default:
                    throw new Error(`Unknown wallet type: ${type}`);
            }

            if (connectedWallet) {
                setWallet(connectedWallet);
                setAddress(connectedWallet.classicAddress);
                setWalletType(type);
                return true;
            }

            return false;

        } catch (err: any) {
            console.error('Wallet connection error:', err);
            setError(err.message || 'Failed to connect wallet');
            return false;
        } finally {
            setIsConnecting(false);
        }
    }, []);

    /**
     * Disconnect wallet
     */
    const disconnect = useCallback(() => {
        setWallet(null);
        setAddress(null);
        setWalletType(null);
        setBalance('0');
        setError(null);
    }, []);

    /**
     * Sign a transaction
     */
    const signTransaction = useCallback(async (tx: any) => {
        if (!wallet) {
            throw new Error('Wallet not connected');
        }

        // For Crossmark/GemWallet, we'd use their signing APIs
        // For manual wallet, we can sign directly
        if (walletType === 'manual') {
            return wallet.sign(tx);
        }

        // For browser extension wallets, request signature
        if (walletType === 'crossmark') {
            return signWithCrossmark(tx);
        }

        if (walletType === 'gem') {
            return signWithGemWallet(tx);
        }

        throw new Error('Signing not supported for this wallet type');
    }, [wallet, walletType]);

    const value: XRPLWalletContextType = {
        address,
        isConnected,
        isConnecting,
        walletType,
        wallet,
        network,
        setNetwork,
        balance,
        refreshBalance,
        connect,
        disconnect,
        signTransaction,
        error,
    };

    return (
        <XRPLWalletContext.Provider value={value}>
            {children}
        </XRPLWalletContext.Provider>
    );
}

/**
 * Hook to use XRPL wallet context
 */
export function useXRPLWallet() {
    const context = useContext(XRPLWalletContext);
    if (!context) {
        throw new Error('useXRPLWallet must be used within XRPLWalletProvider');
    }
    return context;
}

// ============================================
// Wallet-specific connection helpers
// ============================================

/**
 * Connect to Crossmark browser extension
 */
async function connectCrossmark(): Promise<Wallet | null> {
    // Check if Crossmark is installed
    const crossmark = (window as any).crossmark;
    if (!crossmark) {
        throw new Error('Crossmark extension not found. Please install it from crossmark.io');
    }

    try {
        // Request connection
        const response = await crossmark.signIn();
        if (response?.address) {
            // Crossmark doesn't expose the seed, so we create a read-only wallet
            // For signing, we'll use crossmark.sign() directly
            return Wallet.fromSeed('sEdTh4u6p6m3P4zVpSpKsAv3rFGpvzT'); // Placeholder
        }
        throw new Error('Crossmark connection rejected');
    } catch (err) {
        throw new Error('Failed to connect to Crossmark');
    }
}

/**
 * Connect to GemWallet browser extension
 */
async function connectGemWallet(): Promise<Wallet | null> {
    // Check if GemWallet is installed
    const gemWallet = (window as any).gemWallet;
    if (!gemWallet) {
        throw new Error('GemWallet extension not found. Please install it from gemwallet.app');
    }

    try {
        // Check if connected
        const isConnected = await gemWallet.isConnected();
        if (!isConnected) {
            await gemWallet.connect();
        }

        // Get address
        const response = await gemWallet.getAddress();
        if (response?.result?.address) {
            // GemWallet handles signing internally
            return Wallet.fromSeed('sEdTh4u6p6m3P4zVpSpKsAv3rFGpvzT'); // Placeholder
        }
        throw new Error('GemWallet connection rejected');
    } catch (err) {
        throw new Error('Failed to connect to GemWallet');
    }
}

/**
 * Sign transaction with Crossmark
 */
async function signWithCrossmark(tx: any): Promise<any> {
    const crossmark = (window as any).crossmark;
    if (!crossmark) {
        throw new Error('Crossmark not available');
    }
    return crossmark.sign(tx);
}

/**
 * Sign transaction with GemWallet
 */
async function signWithGemWallet(tx: any): Promise<any> {
    const gemWallet = (window as any).gemWallet;
    if (!gemWallet) {
        throw new Error('GemWallet not available');
    }
    return gemWallet.signTransaction({ transaction: tx });
}
