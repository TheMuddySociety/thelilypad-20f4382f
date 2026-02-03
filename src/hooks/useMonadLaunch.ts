/**
 * useMonadLaunch - Hook for Monad NFT launching
 * 
 * Provides EVM-compatible NFT deployment for Monad chain
 * Uses standard ERC-721 contracts
 */

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import {
    MonadNetwork,
    DEFAULT_MONAD_NETWORK,
    getMonadChainId,
    switchToMonad,
    getMonadExplorerUrl,
} from '@/config/monad';

export interface MonadCollectionParams {
    name: string;
    symbol: string;
    description?: string;
    imageUri?: string;
    metadataBaseUri?: string;
    totalSupply: number;
    royaltyBasisPoints?: number;
    maxMintPerWallet?: number;
    mintPrice?: string; // In MON
}

export interface MonadMintResult {
    success: boolean;
    contractAddress?: string;
    transactionHash?: string;
    tokenIds?: string[];
    error?: string;
}

export function useMonadLaunch(network: MonadNetwork = DEFAULT_MONAD_NETWORK) {
    const [isConnected, setIsConnected] = useState(false);
    const [address, setAddress] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [balance, setBalance] = useState<string>('0');

    // Check wallet connection
    useEffect(() => {
        const checkConnection = async () => {
            if (typeof window === 'undefined' || !window.ethereum) {
                return;
            }

            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts && accounts.length > 0) {
                    setAddress(accounts[0]);
                    setIsConnected(true);

                    // Check if on correct network
                    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                    const expectedChainId = `0x${getMonadChainId(network).toString(16)}`;

                    if (chainId !== expectedChainId) {
                        console.log('Wrong network, expected Monad');
                    }
                }
            } catch (err) {
                console.error('Error checking connection:', err);
            }
        };

        checkConnection();

        // Listen for account changes
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts: string[]) => {
                if (accounts.length > 0) {
                    setAddress(accounts[0]);
                    setIsConnected(true);
                } else {
                    setAddress(null);
                    setIsConnected(false);
                }
            });
        }
    }, [network]);

    /**
     * Connect EVM wallet (Phantom EVM or MetaMask)
     */
    const connect = useCallback(async (): Promise<boolean> => {
        if (typeof window === 'undefined' || !window.ethereum) {
            toast.error('No EVM wallet found. Please install Phantom or MetaMask.');
            return false;
        }

        try {
            // Request account access
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            if (accounts && accounts.length > 0) {
                setAddress(accounts[0]);
                setIsConnected(true);

                // Try to switch to Monad network
                const switched = await switchToMonad(network);
                if (!switched) {
                    toast.warning('Please switch to Monad network in your wallet');
                }

                toast.success('Wallet connected');
                return true;
            }
            return false;
        } catch (err: any) {
            console.error('Error connecting:', err);
            toast.error(err.message || 'Failed to connect wallet');
            return false;
        }
    }, [network]);

    /**
     * Disconnect wallet
     */
    const disconnect = useCallback(() => {
        setAddress(null);
        setIsConnected(false);
        toast.success('Wallet disconnected');
    }, []);

    /**
     * Create/Deploy an NFT collection on Monad
     * 
     * Note: This requires a deployed NFT factory contract on Monad
     * For now, this is a placeholder that will work when Monad mainnet launches
     */
    const createCollection = useCallback(async (
        params: MonadCollectionParams
    ): Promise<MonadMintResult> => {
        if (!isConnected || !address) {
            const error = 'Please connect your wallet first';
            toast.error(error);
            return { success: false, error };
        }

        setIsCreating(true);
        setError(null);

        try {
            // Ensure we're on Monad network
            const switched = await switchToMonad(network);
            if (!switched) {
                throw new Error('Please switch to Monad network');
            }

            // TODO: Deploy ERC-721 contract when Monad mainnet launches
            // For now, return a placeholder
            toast.info('Monad NFT deployment coming soon!', {
                description: 'Monad is currently in testnet. Full NFT deployment will be available at mainnet launch.',
            });

            return {
                success: false,
                error: 'Monad NFT deployment not yet available',
            };

            // Example of what the actual implementation would look like:
            /*
            // Deploy ERC-721 contract
            const factoryAddress = MONAD_CONTRACTS[network].nftFactory;
            const factory = new ethers.Contract(factoryAddress, NFT_FACTORY_ABI, signer);
            
            const tx = await factory.createCollection(
              params.name,
              params.symbol,
              params.metadataBaseUri || '',
              params.totalSupply,
              params.royaltyBasisPoints || 500,
              params.mintPrice || '0',
              params.maxMintPerWallet || 10,
            );
      
            const receipt = await tx.wait();
            const event = receipt.events?.find(e => e.event === 'CollectionCreated');
            const contractAddress = event?.args?.collection;
      
            toast.success('Collection deployed!');
            
            return {
              success: true,
              contractAddress,
              transactionHash: receipt.transactionHash,
            };
            */
        } catch (err: any) {
            const errorMessage = err.message || 'Failed to create collection';
            setError(errorMessage);
            toast.error(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setIsCreating(false);
        }
    }, [isConnected, address, network]);

    /**
     * Mint NFTs from a deployed collection
     */
    const mintNFT = useCallback(async (
        contractAddress: string,
        quantity: number = 1,
        mintPrice?: string
    ): Promise<MonadMintResult> => {
        if (!isConnected || !address) {
            const error = 'Please connect your wallet first';
            toast.error(error);
            return { success: false, error };
        }

        setIsCreating(true);
        setError(null);

        try {
            // TODO: Implement actual minting when contracts are deployed
            toast.info('Monad minting coming soon!');

            return {
                success: false,
                error: 'Monad minting not yet available',
            };
        } catch (err: any) {
            const errorMessage = err.message || 'Failed to mint NFT';
            setError(errorMessage);
            toast.error(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setIsCreating(false);
        }
    }, [isConnected, address]);

    return {
        // Connection
        connect,
        disconnect,
        isConnected,
        address,
        balance,
        network,

        // Collection actions
        createCollection,
        mintNFT,

        // State
        isCreating,
        error,

        // Helpers
        getExplorerUrl: (hash: string, type?: 'tx' | 'address') =>
            getMonadExplorerUrl(hash, type, network),
    };
}

export default useMonadLaunch;
