import React from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useSolanaMint } from '@/hooks/useSolanaMint';
import { SupportedChain, CHAINS } from '@/config/chains';

interface MintButtonProps {
    collectionId: string;
    candyMachineAddress: string; // on-chain candy-machine address (base58)
    collectionAddress: string; // on-chain collection address (base58)
    price: number; // price in native currency
    chain?: SupportedChain; // The chain this collection is on
}

/**
 * Multi-chain mint button that triggers minting for a deployed collection.
 * Supports Solana (full), XRP (limited), and Monad (coming soon).
 */
export function MintButton({
    collectionId,
    candyMachineAddress,
    collectionAddress,
    price,
    chain = 'solana'
}: MintButtonProps) {
    const { isLoading: isSolanaLoading, mintFromCandyMachine } = useSolanaMint();

    // Get chain config for display
    const chainConfig = CHAINS[chain] || CHAINS.solana;
    const currencySymbol = chainConfig.symbol;

    // Check if chain supports minting via this button
    // XRP is handled via handleMint on the detail page directly for now, 
    // but the button should still show the correct info if rendered here.
    const isMintingSupported = chain === 'solana' || chain === 'monad' || chain === 'xrpl';
    const isLoading = isSolanaLoading;

    const handleMint = async () => {
        if (chain === 'xrpl') {
            toast.info('XRP minting is handled directly on the collection detail page.');
            return;
        }
        if (!isMintingSupported) {
            toast.info(`${chainConfig.name} minting coming soon!`);
            return;
        }

        try {
            const result = await mintFromCandyMachine(
                candyMachineAddress,
                collectionAddress,
                {
                    // Minimal phase args – using public phase by default
                    phaseId: 'public',
                    price,
                    // No allow-list proof needed for public phase
                }
            );
            // The hook already tracks the transaction; we just surface UI feedback.
            toast.success('Mint succeeded! 🎉');
        } catch (e) {
            console.error('Mint error', e);
            // The hook sets `error` and shows a toast, but we keep a fallback.
            toast.error('Mint failed. See console for details.');
        }
    };

    return (
        <Button
            size="sm"
            onClick={handleMint}
            disabled={isLoading || !isMintingSupported}
            className="mt-2 w-full"
        >
            {isLoading
                ? 'Minting…'
                : !isMintingSupported
                    ? `${chainConfig.name} Coming Soon`
                    : `Mint for ${price} ${currencySymbol}`
            }
        </Button>
    );
}
