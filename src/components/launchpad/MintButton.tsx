import React from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useSolanaMint } from '@/hooks/useSolanaMint';

/**
 * Simple mint button that triggers a candy‑machine mint for a deployed collection.
 * Assumes `contract_address` is the candy‑machine address.
 */
export function MintButton({
    collectionId,
    candyMachineAddress,
    collectionAddress,
    price,
}: {
    collectionId: string;
    candyMachineAddress: string; // on‑chain candy‑machine address (base58)
    collectionAddress: string; // on‑chain collection address (base58)
    price: number; // price in SOL
}) {
    const { isLoading, error, mintFromCandyMachine } = useSolanaMint();

    const handleMint = async () => {
        try {
            const result = await mintFromCandyMachine(
                candyMachineAddress,
                collectionAddress,
                {
                    // Minimal phase args – using public phase by default
                    phaseId: 'public',
                    price,
                    // No allow‑list proof needed for public phase
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
            disabled={isLoading}
            className="mt-2 w-full"
        >
            {isLoading ? 'Minting…' : `Mint for ${price} SOL`}
        </Button>
    );
}
