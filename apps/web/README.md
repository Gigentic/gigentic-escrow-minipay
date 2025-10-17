# Gigentic Escrow Web App

Secure peer-to-peer escrow platform built on Celo blockchain with wallet-based authentication.

## Features

- ✅ Wallet-only authentication (no signup required)
- ✅ Create escrows with deliverable documents
- ✅ Complete/Dispute flows with transaction handling
- ✅ Admin dispute resolution interface
- ✅ Platform statistics dashboard
- ✅ Document storage with hash verification
- ✅ Mobile-first responsive design
- ✅ MiniPay wallet support

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **Blockchain**: Celo (via Viem & Wagmi)
- **Wallet**: RainbowKit + Composer Kit
- **Storage**: Upstash KV (Redis)
- **State**: React Context + TanStack Query

## Getting Started

### Prerequisites

- Node.js 18+
- PNPM 8+
- Upstash Redis account
- Celo wallet with cUSD on Sepolia testnet

### Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your environment variables:
   ```bash
   # Blockchain Configuration
   NEXT_PUBLIC_MASTER_FACTORY_ADDRESS=0x...    # Your deployed MasterFactory address
   NEXT_PUBLIC_CUSD_ADDRESS=0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b  # cUSD Sepolia
   NEXT_PUBLIC_CHAIN_ID=11142220                # Celo Sepolia

   # Admin Configuration
   ADMIN_WALLET_ADDRESS=0x...                   # Your admin wallet address

   # Upstash KV
   UPSTASH_REDIS_REST_URL=https://...
   UPSTASH_REDIS_REST_TOKEN=...
   ```

### Installation

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev
```

The app will be available at http://localhost:3000

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Landing page
│   ├── dashboard/         # User dashboard
│   ├── create/            # Create escrow page
│   ├── escrow/[address]/  # Escrow detail page
│   ├── how-it-works/      # Guide & FAQ
│   ├── admin/             # Admin pages
│   │   ├── page.tsx       # Admin dashboard
│   │   ├── disputes/      # Dispute management
│   │   └── stats/         # Platform statistics
│   └── api/               # API routes
│       ├── documents/     # Document storage
│       └── admin/         # Admin endpoints
├── components/
│   ├── escrow/            # Escrow-related components
│   ├── admin/             # Admin components
│   ├── wallet/            # Wallet components
│   └── ui/                # shadcn/ui components
└── lib/
    ├── escrow-config.ts   # Contract ABIs & config
    ├── kv.ts              # Upstash client
    ├── hash.ts            # Document hashing
    └── wallet-auth.ts     # Wallet authentication
```

## Key Features

### User Flows

**Create Escrow:**
1. Connect wallet
2. Enter recipient address and amount
3. Define deliverable with acceptance criteria
4. Approve cUSD tokens
5. Create escrow (funds locked on-chain)

**Complete Escrow:**
1. Depositor reviews deliverable
2. Clicks "Complete Escrow"
3. Funds released to recipient
4. Dispute bond returned to depositor

**Dispute Flow:**
1. Either party raises dispute with reason
2. Escrow enters DISPUTED state
3. Admin reviews case
4. Admin resolves (favor depositor or recipient)

### Admin Features

- View all disputed escrows
- Review deliverable documents
- Resolve disputes with detailed rationale
- View platform statistics

### API Endpoints

**Public:**
- `POST /api/documents/store` - Store deliverable/resolution document
- `GET /api/documents/[hash]` - Retrieve document by hash

**Admin Only:**
- `GET /api/admin/disputes` - List all disputed escrows
- `GET /api/admin/disputes/[id]` - Get dispute details
- `POST /api/admin/resolve` - Store resolution document
- `GET /api/admin/stats` - Get platform statistics

## Deployment

### Frontend (Vercel)

1. Push to GitHub
2. Import to Vercel
3. Set environment variables
4. Deploy

### Smart Contracts

Deploy the contracts first from `/apps/contracts`:
```bash
cd ../contracts
pnpm contracts:deploy:sepolia
```

Copy the deployed MasterFactory address to your `.env.local`

## Development Notes

### Responsive Design

All components are built mobile-first with Tailwind breakpoints:
- Base: Mobile (< 640px)
- sm: Tablet (≥ 640px)
- md: Desktop (≥ 768px)
- lg: Large desktop (≥ 1024px)

### Error Handling

All blockchain interactions include try/catch blocks with user-friendly error messages displayed in the UI.

### Loading States

All async operations show loading indicators to improve UX.

### Security

- Wallet signatures verify user identity for API writes
- On-chain checks enforce access control
- No sensitive data stored
- All addresses are public

## Testing Checklist

- [ ] Connect wallet (MiniPay & MetaMask)
- [ ] Create escrow
- [ ] View escrow details
- [ ] Complete escrow
- [ ] Raise dispute
- [ ] Admin: Resolve dispute
- [ ] View dashboard with filters
- [ ] Check responsive design on mobile
- [ ] Verify document storage/retrieval
- [ ] Test error handling

## Troubleshooting

**"Insufficient funds" error:**
- Ensure you have enough cUSD (105% of escrow amount)
- Check wallet is connected to Celo Sepolia

**Admin pages show "Access Denied":**
- Verify ADMIN_WALLET_ADDRESS matches your connected wallet
- Ensure environment variable is set correctly

**Documents not loading:**
- Check Upstash credentials in environment variables
- Verify KV store has proper read/write permissions

## License

MIT

