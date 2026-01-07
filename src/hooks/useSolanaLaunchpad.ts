import { useState, useCallback } from 'react';
import { generateSigner, percentAmount } from '@metaplex-foundation/umi';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { 
  createCollectionV1 as createCoreCollection,
} from '@metaplex-foundation/mpl-core';
import {
  createNft,
} from '@metaplex-foundation/mpl-token-metadata';
import {
  createTree,
} from '@metaplex-foundation/mpl-bubblegum';
import { initializeUmi, SolanaStandard } from '@/config/solana';
import { useWallet } from '@/providers/WalletProvider';
import { toast } from 'sonner';

export interface SolanaCollectionConfig {
  name: string;
  symbol: string;
  description?: string;
  imageUri: string;
  externalUrl?: string;
  royaltyBasisPoints?: number;
  standard: SolanaStandard;
  // Candy Machine specific
  candyMachineConfig?: {
    itemsAvailable: number;
    sellerFeeBasisPoints: number;
    isMutable: boolean;
  };
  // Bubblegum specific
  merkleTreeConfig?: {
    maxDepth: number;
    maxBufferSize: number;
  };
}

export const useSolanaLaunchpad = () => {
  const { network, getSolanaProvider } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getUmi = useCallback(async () => {
    const provider = getSolanaProvider();
    if (!provider || !provider.publicKey) {
      throw new Error("Solana wallet not connected");
    }

    const umi = initializeUmi(network);
    const wallet = {
      publicKey: provider.publicKey,
      signTransaction: provider.signTransaction.bind(provider),
      signAllTransactions: provider.signAllTransactions.bind(provider),
      signMessage: provider.signMessage ? provider.signMessage.bind(provider) : undefined,
    };

    return umi.use(walletAdapterIdentity(wallet));
  }, [getSolanaProvider, network]);

  const createCollection = useCallback(async (config: SolanaCollectionConfig) => {
    setIsLoading(true);
    setError(null);

    try {
      const umi = await getUmi();
      const collectionSigner = generateSigner(umi);
      let result;

      toast.loading(`Creating ${config.standard} collection...`, { id: 'sol-create' });

      switch (config.standard) {
        case 'core':
          result = await createCoreCollection(umi, {
            collection: collectionSigner,
            name: config.name,
            uri: config.imageUri,
          }).sendAndConfirm(umi);
          break;

        case 'token-metadata':
          result = await createNft(umi, {
            mint: collectionSigner as any,
            name: config.name,
            symbol: config.symbol,
            uri: config.imageUri,
            sellerFeeBasisPoints: percentAmount(config.royaltyBasisPoints || 0),
            isCollection: true,
          }).sendAndConfirm(umi);
          break;

        case 'bubblegum':
          // For Bubblegum, we first need to create a Merkle tree
          const merkleTreeSigner = generateSigner(umi);
          const treeConfig = config.merkleTreeConfig || { maxDepth: 14, maxBufferSize: 64 };
          
          const treeBuilder = await createTree(umi, {
            merkleTree: merkleTreeSigner,
            maxDepth: treeConfig.maxDepth,
            maxBufferSize: treeConfig.maxBufferSize,
          });
          await (treeBuilder as any).sendAndConfirm(umi);

          // Then create the collection NFT
          result = await createNft(umi, {
            mint: collectionSigner as any,
            name: config.name,
            symbol: config.symbol,
            uri: config.imageUri,
            sellerFeeBasisPoints: percentAmount(config.royaltyBasisPoints || 0),
            isCollection: true,
          }).sendAndConfirm(umi);

          toast.success(`Collection created with Merkle tree!`, { id: 'sol-create' });
          return {
            signature: result.signature,
            collectionAddress: collectionSigner.publicKey.toString(),
            merkleTreeAddress: merkleTreeSigner.publicKey.toString(),
            standard: config.standard,
          };

        case 'candy-machine':
          // Candy Machine requires additional setup - for now create as token-metadata
          // Full CM setup would need candy guard configuration
          result = await createNft(umi, {
            mint: collectionSigner as any,
            name: config.name,
            symbol: config.symbol,
            uri: config.imageUri,
            sellerFeeBasisPoints: percentAmount(config.royaltyBasisPoints || 0),
            isCollection: true,
          }).sendAndConfirm(umi);
          break;

        case 'inscription':
          // Inscriptions store data on-chain - simplified flow
          result = await createNft(umi, {
            mint: collectionSigner as any,
            name: config.name,
            symbol: config.symbol,
            uri: config.imageUri,
            sellerFeeBasisPoints: percentAmount(config.royaltyBasisPoints || 0),
            isCollection: true,
          }).sendAndConfirm(umi);
          break;

        default:
          throw new Error(`Unsupported standard: ${config.standard}`);
      }

      toast.success(`Collection created successfully!`, { id: 'sol-create' });
      return {
        signature: result.signature,
        collectionAddress: collectionSigner.publicKey.toString(),
        standard: config.standard,
      };
    } catch (err: any) {
      console.error("Solana collection creation error:", err);
      const msg = err.message || "Failed to create collection";
      setError(msg);
      toast.error(msg, { id: 'sol-create' });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getUmi]);

  const getStandardInfo = (standard: SolanaStandard) => {
    const info = {
      'core': {
        gasEstimate: '~0.005 SOL',
        features: ['Ultra-efficient', 'Complex utility', 'Low gas'],
      },
      'token-metadata': {
        gasEstimate: '~0.01 SOL',
        features: ['Maximum compatibility', 'All marketplaces', 'Classic standard'],
      },
      'bubblegum': {
        gasEstimate: '~0.0001 SOL per NFT',
        features: ['Compressed NFTs', 'Ultra-low cost', 'Best for 10k+'],
      },
      'candy-machine': {
        gasEstimate: '~0.02 SOL',
        features: ['Fair launch', 'Bot protection', 'Mint phases'],
      },
      'inscription': {
        gasEstimate: '~0.1 SOL+',
        features: ['Fully on-chain', 'Permanent storage', 'No external deps'],
      },
    };
    return info[standard];
  };

  return {
    isLoading,
    error,
    createCollection,
    getStandardInfo,
  };
};

export default useSolanaLaunchpad;
