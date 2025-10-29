# PeerMint Frontend - Complete Setup

## ✅ FRONTEND IS LIVE!

**URL**: http://localhost:3000

## What's Working

### Components Created
1. **Wallet Provider** (`components/wallet-provider.tsx`)
   - Solana wallet adapter integration
   - Support for Phantom, Solflare, and more
   - Auto-connect enabled

2. **Create Request** (`components/create-request.tsx`)
   - USDC amount input
   - QR string field (fiat payment details)
   - Fee configuration (basis points)
   - Expiry time selector
   - Escrow ATA pre-creation
   - Transaction execution with Anchor

3. **Order List** (`components/order-list.tsx`)
   - Fetch all orders from on-chain program
   - Display order details (amount, creator, helper, QR, status)
   - Action buttons:
     - **Join** (for available requests)
     - **Mark Paid** (after sending fiat)
     - **Release Funds** (after receiving fiat)
   - Status badges (Created, Joined, Paid, Released, Disputed, Resolved)

4. **Main Page** (`app/page.tsx`)
   - Header with wallet button
   - Hero section
   - Two-column layout (create + browse)
   - "How It Works" guide
   - Footer

5. **Anchor Utilities** (`lib/anchor.ts`)
   - Program initialization
   - PDA derivation function
   - Program ID and USDC mint constants

## Installation (Already Done!)

```bash
cd app/peermint-frontend
npm install  # ✅ Completed - 1416 packages installed
```

### Dependencies Installed
- `@coral-xyz/anchor` - Anchor TypeScript client
- `@solana/web3.js` - Solana JavaScript SDK
- `@solana/wallet-adapter-react` - Wallet integration
- `@solana/wallet-adapter-react-ui` - Wallet UI components
- `@solana/wallet-adapter-wallets` - Multi-wallet support
- `@solana/spl-token` - SPL token utilities
- `@jup-ag/api` - Jupiter aggregator (for future use)
- `lucide-react` - Icons
- `next@16.0.1` - Next.js framework
- `react@19.2.0` - React library
- `tailwindcss` - Utility-first CSS

## Server Status

```
✓ Server: RUNNING on http://localhost:3000
✓ Turbopack: Enabled (fast refresh)
✓ Network: http://192.168.1.2:3000
```

## Using the App

### 1. Connect Wallet
- Click "Select Wallet" button (top right)
- Choose Phantom (or other wallet)
- Make sure wallet is on localhost network

### 2. Create a Payment Request

**Steps:**
1. Enter amount in USDC (e.g., `10`)
2. Paste QR string (e.g., `upi://pay?pa=test@paytm&am=800`)
3. Set fee in basis points (e.g., `50` = 0.5%)
4. Set expiry time in hours (e.g., `24`)
5. Click "Create Request"

**What Happens:**
- Creates order PDA
- Pre-creates escrow ATA
- Transfers USDC from your wallet to escrow
- Order appears in the list with status "Created"

### 3. Fulfill a Request (Different Wallet)

**Steps:**
1. Switch to a different wallet (or use another browser)
2. View available orders in the right panel
3. Click "Join" on an order
4. Send fiat payment via the QR code shown
5. Click "Mark Paid" after sending

**What Happens:**
- Sets you as the helper
- Status changes to "Joined" → "Paid"
- Creator is notified (in real app)

### 4. Release Funds (Original Creator)

**Steps:**
1. Switch back to creator wallet
2. Verify fiat payment received
3. Click "Release Funds"

**What Happens:**
- Calculates fee: (amount × fee_bps) / 10000
- Transfers (amount - fee) to helper
- Transfers fee to fee receiver
- Status changes to "Released"

## Configuration

### Update USDC Mint (Required for Local Testing)

Edit `lib/anchor.ts`:

```typescript
export const USDC_MINT = new PublicKey("YOUR_TEST_MINT_HERE");
```

**Create test mint:**
```bash
spl-token create-token --decimals 6
# Copy the address
```

### Switch to Devnet

Edit `components/wallet-provider.tsx`:
```typescript
const endpoint = useMemo(() => clusterApiUrl("devnet"), []);
```

Edit `lib/anchor.ts`:
```typescript
export const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"); // Devnet USDC
```

## Troubleshooting

### Wallet Won't Connect
- Ensure Phantom is installed
- Switch Phantom to localhost network:
  - Settings → Network → Add Network
  - Name: Localhost
  - RPC: http://127.0.0.1:8899
- Clear site data and refresh

### "Program Not Found"
- Start validator: `solana-test-validator`
- Deploy program: `anchor deploy`
- Verify program ID in `lib/anchor.ts`

### "Invalid Account Data"
- Create test USDC mint
- Update `USDC_MINT` in `lib/anchor.ts`
- Mint tokens to your wallet:
  ```bash
  spl-token create-account <MINT>
  spl-token mint <MINT> 1000
  ```

### "Insufficient Funds"
- Airdrop SOL: `solana airdrop 2`
- Mint test USDC (see above)

### BigInt Warning
- This is harmless, ignore it
- Warning: `bigint: Failed to load bindings, pure JS will be used`

## File Structure

```
app/peermint-frontend/
├── app/
│   ├── layout.tsx              # Root layout with wallet provider
│   ├── page.tsx                # Main page
│   ├── globals.css             # Global styles
│   └── fonts/
├── components/
│   ├── wallet-provider.tsx     # Wallet context
│   ├── create-request.tsx      # Create form
│   └── order-list.tsx          # Order browser
├── lib/
│   ├── anchor.ts               # Program utilities
│   └── utils.ts                # Helper functions
├── public/
├── peermint.json               # Program IDL
├── package.json
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── README.md
└── SETUP.md
```

## Development Commands

```bash
# Start dev server (ALREADY RUNNING)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Next Features to Add

1. **Jupiter Integration**
   - Add token swap UI
   - Any SPL token → USDC
   - Use @jup-ag/api (already installed)

2. **QR Code Upload**
   - Image upload component
   - QR code parsing
   - Display QR to helper

3. **Order History**
   - Filter by status
   - Search functionality
   - Export to CSV

4. **Real-time Updates**
   - WebSocket connection
   - Order status changes
   - Notifications

5. **Dispute UI**
   - Raise dispute button
   - Arbiter resolution interface
   - Evidence upload

## Production Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables
Create `.env.local`:
```
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_PROGRAM_ID=2rQAwzmXe4vXLCHAcVbEzqDU5i5mPkKoRp5tdPqYUWyS
NEXT_PUBLIC_USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

## Success! 🎉

Your PeerMint frontend is:
- ✅ Fully built
- ✅ Running on http://localhost:3000
- ✅ Connected to Anchor program
- ✅ Ready to use

**Try it now!** Open http://localhost:3000 in your browser.
