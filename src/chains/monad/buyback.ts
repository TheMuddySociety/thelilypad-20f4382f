/**
 * Monad Buyback — ERC-20 token swap via DEX router
 *
 * Uses a Uniswap V2-style router to swap MON → platform token.
 */

import { createPublicClient, createWalletClient, custom, http, parseEther, type Address } from 'viem';
import { monadTestnet } from 'viem/chains';
import { MONAD_NETWORKS, DEFAULT_MONAD_NETWORK } from '@/config/monad';
import { PLATFORM_WALLETS } from '@/config/treasury';

// Minimal Uniswap V2 Router ABI
const ROUTER_ABI = [
    {
        inputs: [
            { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
            { internalType: 'address[]', name: 'path', type: 'address[]' },
            { internalType: 'address', name: 'to', type: 'address' },
            { internalType: 'uint256', name: 'deadline', type: 'uint256' },
        ],
        name: 'swapExactETHForTokens',
        outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
        stateMutability: 'payable',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
            { internalType: 'address[]', name: 'path', type: 'address[]' },
        ],
        name: 'getAmountsOut',
        outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

export interface MonadBuybackResult {
    success: boolean;
    txHash?: string;
    tokensBought?: bigint;
    monSpent?: string;
    error?: string;
}

/**
 * Execute a buyback swap on Monad (MON → Token)
 *
 * @param routerAddress  DEX router contract address
 * @param tokenAddress   Token to buy
 * @param wmonAddress    Wrapped MON address
 * @param amountMon      Amount of MON to spend
 * @param slippageBps    Slippage tolerance in BPS (default 100 = 1%)
 */
export async function executeMonadBuyback(
    routerAddress: Address,
    tokenAddress: Address,
    wmonAddress: Address,
    amountMon: string,
    slippageBps: number = 100
): Promise<MonadBuybackResult> {
    if (typeof window === 'undefined' || !window.ethereum) {
        return { success: false, error: 'No wallet provider found' };
    }

    try {
        const publicClient = createPublicClient({
            chain: monadTestnet,
            transport: http(MONAD_NETWORKS[DEFAULT_MONAD_NETWORK].url),
        });

        const walletClient = createWalletClient({
            chain: monadTestnet,
            transport: custom(window.ethereum),
        });

        const [account] = await walletClient.getAddresses();
        const value = parseEther(amountMon);
        const path = [wmonAddress, tokenAddress] as Address[];
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 min

        // Get quote
        const amounts = await publicClient.readContract({
            address: routerAddress,
            abi: ROUTER_ABI,
            functionName: 'getAmountsOut',
            args: [value, path],
        });

        const minOut = (amounts[1] * BigInt(10000 - slippageBps)) / 10000n;

        // Execute swap
        const hash = await walletClient.writeContract({
            account,
            address: routerAddress,
            abi: ROUTER_ABI,
            functionName: 'swapExactETHForTokens',
            args: [minOut, path, account, deadline],
            value,
        });

        return {
            success: true,
            txHash: hash,
            tokensBought: amounts[1],
            monSpent: amountMon,
        };
    } catch (err: any) {
        console.error('[Monad Buyback] Error:', err.message);
        return { success: false, error: err.message };
    }
}
