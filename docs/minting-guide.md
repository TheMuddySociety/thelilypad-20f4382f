# Minting Guide

This guide covers everything you need to know about minting NFTs on The Lily Pad.

## Before You Mint

### Checklist

- [ ] Wallet connected
- [ ] Correct network (Mainnet or Testnet)
- [ ] Sufficient MON balance
- [ ] Gas fees covered
- [ ] Allowlist eligibility (if required)

## Minting Flow

### Step 1: Connect Wallet

```
Not Connected → Click "Connect Wallet" → Approve in MetaMask → Connected ✓
```

### Step 2: Check Network

The mint card will show warnings if:
- Wrong network detected
- Network switch required

```typescript
// Automatic network detection
if (isWrongNetwork) {
  // Show "Switch to [Network Name]" button
}
```

### Step 3: Verify Balance

The mint card displays:
- Your current balance
- Mint cost
- Estimated gas
- Total required

```
┌─────────────────────────────┐
│ 💰 Your Balance: 2.5 MON   │
├─────────────────────────────┤
│ Mint Cost:        0.5 MON  │
│ + Gas Fee:       ~0.003 MON │
│ ─────────────────────────── │
│ Total:          ~0.503 MON  │
└─────────────────────────────┘
```

### Step 4: Select Amount

Use the +/- buttons or input field:
- Minimum: 1
- Maximum: Phase limit (e.g., 5 per wallet)

### Step 5: Review & Mint

1. Check the phase you're minting in
2. Verify total cost
3. Click **Mint [X] NFT(s)**
4. Confirm transaction in wallet
5. Wait for confirmation

## Mint Card States

### Normal State
```
[Mint 2 NFTs] - Enabled, ready to mint
```

### Loading State
```
[🔄 Minting...] - Transaction pending
```

### Sold Out
```
[Sold Out] - Phase/collection exhausted
```

### Wrong Network
```
[⚠️ Wrong Network] - Need to switch
```

### Insufficient Balance
```
[⚠️ Insufficient Balance] - Need more MON
```

### Not Connected
```
[Connect to Mint] - Wallet required
```

## Gas Estimation

The platform provides real-time gas estimates:

```typescript
{
  gasLimit: 200000,        // Estimated gas units
  gasPrice: 0.000000025,   // MON per gas unit
  totalGas: 0.005          // Total gas in MON
}
```

### Gas Breakdown

| Factor | Gas Impact |
|--------|------------|
| Base mint | ~150,000 |
| Per additional NFT | ~50,000 |
| Network congestion | Variable |

### Testnet vs Mainnet Gas

- **Testnet**: Lower gas prices, faster confirmation
- **Mainnet**: Market-rate gas, real costs

## Phase Requirements

### Public Mint
- No requirements
- Open to all wallets
- Standard pricing

### Allowlist Mint
- Must be on allowlist
- Discounted pricing
- Limited quantity

### Verifying Eligibility

The platform automatically checks:
```typescript
if (activePhase.requiresAllowlist) {
  // Check if wallet is on allowlist
  // Display eligibility message
}
```

## Transaction Confirmation

After clicking Mint:

1. **Wallet Popup**: Review and confirm
2. **Pending**: Transaction submitted
3. **Confirming**: Waiting for block
4. **Success**: NFT minted! 🎉

### Success Message
```
✅ Successfully minted 2 NFTs!
Check your wallet for your new NFTs
```

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| User rejected | Cancelled in wallet | Try again |
| Insufficient funds | Balance too low | Add more MON |
| Phase ended | Phase is over | Wait for next phase |
| Max reached | Hit wallet limit | Can't mint more |
| Wrong network | On incorrect chain | Switch networks |

### Error Messages

```typescript
// Insufficient balance
toast.error("Insufficient balance", {
  description: "You need 0.25 more MON (including gas) to mint"
});

// Wrong network
toast.error("Wrong network detected", {
  description: "Please switch to Monad Mainnet to mint"
});
```

## Post-Mint

After successful mint:

1. NFT appears in your wallet
2. Live supply updates
3. Transaction viewable on explorer
4. Balance decreases

### Viewing Your NFT

Options:
- Check wallet (MetaMask, etc.)
- View on block explorer
- See in The Lily Pad profile (coming soon)

## Tips for Successful Mints

### Before High-Demand Mints

1. **Prepare funds early** - Have extra for gas
2. **Test on testnet** - Practice the flow
3. **Clear browser cache** - Fresh session
4. **Stable connection** - Reliable internet
5. **Have backup** - Alternative RPC or wallet

### During Mint

1. **Don't spam click** - Wait for confirmation
2. **Check gas** - Adjust if needed
3. **Be patient** - High demand = delays
4. **Watch for updates** - Follow official channels

### Common Mistakes to Avoid

- ❌ Minting on wrong network
- ❌ Ignoring gas fees
- ❌ Multiple transactions at once
- ❌ Closing browser during mint
- ❌ Using compromised wallets

## Testnet Minting

Practice minting on testnet:

1. Switch to testnet mode
2. Get test tokens from faucet
3. Mint test NFTs
4. Verify flow works
5. Switch to mainnet when ready

## Code Example

For developers integrating minting:

```typescript
const handleMint = async () => {
  // Pre-mint checks
  if (!isConnected) return showConnectPrompt();
  if (isWrongNetwork) return showNetworkSwitch();
  if (hasInsufficientBalance) return showBalanceError();
  
  setIsMinting(true);
  
  try {
    const txHash = await mintNFT({
      collectionAddress,
      amount: mintAmount,
      phase: activePhase.id,
      proof: allowlistProof, // If applicable
    });
    
    toast.success(`Minted ${mintAmount} NFTs!`);
    refreshSupply();
  } catch (error) {
    handleMintError(error);
  } finally {
    setIsMinting(false);
  }
};
```
