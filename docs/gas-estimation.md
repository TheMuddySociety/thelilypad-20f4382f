# Gas Estimation

Understanding gas fees is crucial for successful transactions on The Lily Pad.

## What is Gas?

Gas is the fee paid to execute transactions on the blockchain. It consists of:

- **Gas Limit**: Maximum units of computation
- **Gas Price**: Cost per gas unit (in Gwei)
- **Total Fee**: Gas Limit × Gas Price

## Gas Display

The mint card shows gas estimates:

```
┌─────────────────────────────────┐
│ ⛽ Estimated Gas               │
│                                 │
│ ~0.003750 MON                   │
│                                 │
│ Gas Limit: 250,000             │
│ Gas Price: 15.00 Gwei          │
└─────────────────────────────────┘
```

## How Gas is Calculated

### Base Costs

| Operation | Approximate Gas |
|-----------|-----------------|
| NFT Mint (base) | 150,000 |
| Per additional NFT | 50,000 |
| Token transfer | 21,000 |
| Contract interaction | Variable |

### Formula

```typescript
const gasLimit = baseGas + (perNftGas * mintAmount);
const gasCost = gasLimit * gasPrice;
const totalCost = mintPrice + gasCost;
```

### Example Calculation

```
Minting 3 NFTs:
- Base gas: 150,000
- Per NFT (3 × 50,000): 150,000
- Total gas limit: 300,000
- Gas price: 25 Gwei (0.000000025 MON)
- Gas cost: 300,000 × 0.000000025 = 0.0075 MON
```

## Gas Estimation States

### Loading

```tsx
<div className="flex items-center gap-1">
  <Loader2 className="animate-spin" />
  <span>Estimating...</span>
</div>
```

### Estimated

```tsx
<span>~0.003750 MON</span>
```

### Not Available

```tsx
<span>--</span>
```

## Factors Affecting Gas

### Network Congestion

| Congestion | Gas Price | Speed |
|------------|-----------|-------|
| Low | Base rate | Fast |
| Medium | 1.5-2x base | Normal |
| High | 3x+ base | Slow |

### Transaction Complexity

- Simple mint: Lower gas
- Batch mint: Higher total, lower per-unit
- With allowlist verification: Additional gas

### Contract Efficiency

Well-optimized contracts use less gas.

## Code Implementation

### Estimating Gas

```typescript
const [gasEstimate, setGasEstimate] = useState<{
  gasLimit: number;
  gasPrice: number;
  totalGas: number;
} | null>(null);

useEffect(() => {
  const estimateGas = async () => {
    setIsEstimatingGas(true);
    
    // Simulated values (replace with actual estimation)
    const baseGasLimit = 150000;
    const perNftGas = 50000;
    const gasLimit = baseGasLimit + (perNftGas * mintAmount);
    const gasPrice = isTestnet ? 0.000000001 : 0.000000025;
    const totalGas = gasLimit * gasPrice;
    
    setGasEstimate({ gasLimit, gasPrice, totalGas });
    setIsEstimatingGas(false);
  };

  if (isConnected && !isWrongNetwork) {
    estimateGas();
  }
}, [mintAmount, isConnected, isWrongNetwork]);
```

### Real Gas Estimation

For production, use actual RPC estimation:

```typescript
const estimateRealGas = async () => {
  const gasLimit = await publicClient.estimateContractGas({
    address: contractAddress,
    abi: nftAbi,
    functionName: 'mint',
    args: [mintAmount],
    account: userAddress,
  });
  
  const gasPrice = await publicClient.getGasPrice();
  
  return {
    gasLimit: Number(gasLimit),
    gasPrice: Number(formatEther(gasPrice)),
    totalGas: Number(gasLimit) * Number(formatEther(gasPrice)),
  };
};
```

## Total Cost Breakdown

The mint card shows a complete breakdown:

```
┌─────────────────────────────────┐
│ Mint Cost:        0.50 MON     │
│ + Gas Fee:       ~0.0075 MON    │
│ ─────────────────────────────── │
│ Total:          ~0.5075 MON     │
└─────────────────────────────────┘
```

### Including Gas in Balance Check

```typescript
const totalWithGas = totalCost + (gasEstimate?.totalGas || 0);
const hasInsufficientBalance = totalWithGas > userBalance;
```

## Testnet vs Mainnet

| Aspect | Testnet | Mainnet |
|--------|---------|---------|
| Gas Price | ~1 Gwei | ~25 Gwei |
| Real Cost | $0 | Actual MON |
| Speed | Fast | Network dependent |
| Faucet | Available | N/A |

## Best Practices

### For Users

1. **Check gas before minting** - Review the estimate
2. **Have extra buffer** - Keep 10-20% extra for fluctuations
3. **Avoid congestion** - Mint during off-peak times
4. **Test on testnet** - Verify flow without real costs

### For Developers

1. **Always show estimates** - Users should know costs
2. **Update dynamically** - Refresh when amount changes
3. **Handle failures** - Gas estimation can fail
4. **Include in balance check** - Don't forget gas in affordability

## Error Handling

### Estimation Failed

```typescript
try {
  const estimate = await estimateGas();
} catch (error) {
  console.error("Gas estimation failed:", error);
  // Show fallback estimate or warning
}
```

### Insufficient for Gas

```tsx
{hasInsufficientBalance && (
  <div className="text-destructive">
    Insufficient balance. Need {(totalWithGas - userBalance).toFixed(4)} more MON
  </div>
)}
```

## Gas Optimization Tips

1. **Batch mints** - Multiple NFTs in one transaction
2. **Off-peak timing** - Lower network congestion
3. **Efficient contracts** - Well-optimized collection contracts
4. **Gas price alerts** - Monitor for favorable rates
