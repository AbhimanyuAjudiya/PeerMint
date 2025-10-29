# PeerMint Frontend Setup Guide

## Quick Start

### 1. Start Local Solana Validator
```bash
# In terminal 1 (from project root)
solana-test-validator
```

### 2. Deploy Anchor Program (if not already deployed)
```bash
# In terminal 2 (from project root)
anchor build
anchor deploy
```

Your program ID should be: `2rQAwzmXe4vXLCHAcVbEzqDU5i5mPkKoRp5tdPqYUWyS`

### 3. Run Frontend
```bash
# In terminal 3
cd app/peermint-frontend
npm run dev
```

Open http://localhost:3000

### 4. Setup Test USDC

You'll need to create a test USDC mint and fund your wallet:

```bash
# Create test USDC mint (6 decimals)
spl-token create-token --decimals 6

# Note the token address, update USDC_MINT in lib/anchor.ts

# Create token account
spl-token create-account <TOKEN_ADDRESS>

# Mint some USDC to yourself
spl-token mint <TOKEN_ADDRESS> 1000
```

## Configuration

### Update Mint Address

Edit `lib/anchor.ts`:
```typescript
export const USDC_MINT = new PublicKey("YOUR_TEST_USDC_MINT_HERE");
```

### Switch to Devnet

Edit `components/wallet-provider.tsx`:
```typescript
const endpoint = useMemo(() => clusterApiUrl("devnet"), []);
```

And update `lib/anchor.ts`:
```typescript
export const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"); // Devnet USDC
```

## Testing the Flow

1. **Connect Wallet**: Click wallet button, connect Phantom
2. **Create Request**: 
   - Enter amount: `10`
   - QR String: `upi://pay?pa=test@paytm&am=800`
   - Fee: `50` (0.5%)
   - Expiry: `24` hours
   - Click "Create Request"

3. **Join Request** (use different wallet):
   - Click "Join" on an available request
   
4. **Mark Paid** (helper wallet):
   - After sending fiat, click "Mark Paid"

5. **Release Funds** (creator wallet):
   - After receiving fiat, click "Release Funds"
   - USDC is automatically sent to helper

## Troubleshooting

### "Program not found"
- Ensure `solana-test-validator` is running
- Deploy program: `anchor deploy`
- Check program ID matches in `lib/anchor.ts`

### "Invalid account data"
- USDC mint address might be wrong
- Create test token and update `USDC_MINT`

### "Insufficient funds"
- Airdrop SOL: `solana airdrop 2`
- Mint test USDC (see setup above)

### Wallet won't connect
- Ensure Phantom is installed
- Switch Phantom to localhost network
- Clear site data and refresh

## Development Notes

- Use localhost for fastest iteration
- Test with devnet before mainnet
- Always verify amounts and addresses
- Check browser console for errors

## Next Steps

- [ ] Add Jupiter integration for Any Token → USDC swaps
- [ ] Implement QR code image upload
- [ ] Add dispute resolution UI
- [ ] Create order history page
- [ ] Add real-time order updates
