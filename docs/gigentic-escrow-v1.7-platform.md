# Gigentic Escrow Platform Architecture v1.7
## Simplified Wallet-Based Authentication

This document outlines the simplified platform architecture for the Gigentic Escrow project. We've streamlined the design by removing third-party identity verification and focusing on pure wallet-based authentication, making the platform simpler, faster to build, and easier to maintain.

## Key Design Principles
- **Maximum Simplicity**: Minimal backend, maximum on-chain functionality
- **Wallet-Only Auth**: No external identity services, no user accounts
- **Mobile Optimized**: Built for MiniPay users on Celo
- **Factory Pattern**: Individual escrow contracts deployed via master factory
- **Hash-Based Documents**: Off-chain storage with on-chain hash verification

---

## Platform Architecture Overview

### 1. **App Structure - Factory-Based Escrow System**

The platform implements a **factory-based architecture** with hash-verified off-chain documents:

```
Frontend (Next.js + Celo Composer Kit)
├── Pages
│   ├── Dashboard (user's escrows)
│   ├── Create escrow (with deliverable upload)
│   ├── View escrow details
│   ├── Admin dispute resolution
│   └── Profile (transaction history, statistics)
├── API Routes (Next.js)
│   ├── Document management (2 endpoints)
│   └── Admin operations (4 endpoints)
├── Contract Interactions
│   ├── MasterFactory (escrow creation, registry)
│   └── EscrowContract instances (funds, disputes)
└── Off-chain Storage (Upstash KV)
    ├── Deliverable documents (by hash)
    ├── Resolution documents (by hash)
    └── User metadata (optional, by address)
```

**Why this architecture:**
- **Factory Pattern**: Each escrow gets its own contract instance for gas efficiency
- **Hash Verification**: Documents stored off-chain but verified on-chain via hashes
- **Minimal Backend**: Only for document storage and admin operations
- **Wallet-Only**: User's wallet address IS their user ID - no signup required
- **Mobile First**: Optimized for MiniPay wallet integration

### 2. **User Management - Pure Wallet Authentication**

**Authentication Model:**
- Users identified **solely by wallet address** (MiniPay, MetaMask, etc.)
- No user accounts, no passwords, no email verification
- Wallet connection = user is "logged in"
- Wallet signature provides authentication for sensitive operations

**User Identity Flow:**
```typescript
// When user connects wallet
const address = await connector.getAddress(); // e.g., "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"

// This IS their user ID across the entire platform
// Use it to:
// - Display their escrows: factory.getUserEscrows(address)
// - Check their role: factory.admin() === address ? 'admin' : 'user'
// - Store preferences: localStorage.setItem(`prefs:${address}`, data)
// - Query their history: filter events by address
```

**User State Management:**
- **Persistent Data**: Smart contract events + blockchain state
- **Session Data**: React Context for current wallet connection
- **Preferences**: localStorage (theme, language) - keyed by wallet address
- **No Server Sessions**: Every request is stateless, authenticated by wallet

**User Profile Information:**
All user data comes from blockchain:
- **Transaction History**: Query blockchain events filtered by address
- **Active Escrows**: `factory.getUserEscrows(address)`
- **Statistics**: Count of completed/disputed escrows from events
- **Reputation**: Calculated from on-chain transaction history

### 3. **API Design**

**Document Management (2 endpoints):**
```javascript
POST /api/documents/store      // Store deliverable/resolution documents
GET  /api/documents/[hash]     // Retrieve document by hash
```

**Admin Operations (4 endpoints):**
```javascript
GET  /api/admin/disputes       // List all disputed escrows
GET  /api/admin/disputes/[id]  // Get specific dispute details
POST /api/admin/resolve        // Resolve dispute (calls contract)
GET  /api/admin/stats          // Platform statistics
```

**Why this minimal API:**
- **Only 6 endpoints total** - everything else is on-chain or client-side
- **No user endpoints** - wallet connection handles authentication
- **No session management** - completely stateless API
- **Simple authorization** - check `msg.sender` in contract or wallet signature

**API Authorization Pattern:**
```typescript
// For admin endpoints
export async function GET(request: Request) {
  const address = await verifyWalletSignature(request);
  const isAdmin = await factory.read.admin() === address;
  
  if (!isAdmin) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // ... admin logic
}

// For public endpoints - no auth needed
export async function GET(request: Request) {
  const hash = params.hash;
  const document = await kv.get(`deliverable:${hash}`);
  return Response.json(document);
}
```

---

## Recommended Tech Stack

### Core Technologies

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Smart Contracts** | Solidity 0.8.28 | Factory + escrow logic |
| **Blockchain** | Celo | Low-cost, mobile-first chain |
| **Currency** | cUSD | Stable token for escrow amounts |
| **Frontend** | Next.js 14 | React framework with API routes |
| **Styling** | Tailwind CSS + shadcn/ui | Component library |
| **State Management** | React Context | Wallet connection state |
| **Wallet Connection** | RainbowKit + Wagmi + Viem | Multi-wallet support |
| **Storage** | Upstash KV | Document storage only |
| **Hosting** | Vercel | Frontend and API hosting |

### What you DON'T need:
- ❌ SQL database (blockchain is the database)
- ❌ User authentication system (wallet = authentication)
- ❌ Backend server (Next.js API routes only)
- ❌ Session management (completely stateless)
- ❌ Third-party identity services (wallet address is identity)
- ❌ User signup/login flows (connect wallet = login)
- ❌ Password management (no passwords!)
- ❌ Email verification (no emails!)

---

## Data Storage Strategy

| Data Type | Storage Location | Access Pattern | Why |
|-----------|-----------------|----------------|-----|
| **Core escrow data** | Smart Contracts | Public reads | Business logic, immutable |
| **User's escrows** | Smart Contracts | `getUserEscrows(address)` | Indexed by wallet address |
| **Transaction history** | Blockchain Events | Event queries by address | Immutable history |
| **Deliverable documents** | KV Store (by hash) | Hash-verified | Gas efficiency, detailed specs |
| **Resolution documents** | KV Store (by hash) | Hash-verified | Arbitration records |
| **User preferences** | localStorage | Client-only (keyed by address) | Theme, language, per-device |
| **Platform statistics** | Contract state | Public reads | Global counters |
| **Admin config** | Environment vars | Server-only | Simple configuration |

### KV Store Schema Examples

**Deliverable Document:**
```typescript
// Key: deliverable:{hash}
{
  title: "Website Development",
  description: "Build landing page with React and Tailwind CSS",
  acceptanceCriteria: [
    "Responsive design for mobile and desktop",
    "SEO optimized with meta tags",
    "Load time under 2 seconds"
  ],
  escrowAddress: "0x123...",
  depositor: "0x456...",
  recipient: "0x789...",
  amount: "1000",
  createdAt: 1234567890,
  category: "Development" // optional
}
```

**Resolution Document:**
```typescript
// Key: resolution:{hash}
{
  escrowAddress: "0x123...",
  arbiter: "0xabc...",
  favorDepositor: false,
  disputeReason: "Work not completed as specified",
  deliverableReview: "All acceptance criteria were met",
  evidenceConsidered: ["GitHub repository", "Live website URL"],
  decisionRationale: "Deliverables met all specified criteria. Website is responsive and meets performance requirements.",
  resolvedAt: 1234567890,
  transactionHash: "0xdef..." // on-chain resolution tx
}
```

**Optional User Metadata:**
```typescript
// Key: user:{address}
// This is completely optional - for display purposes only
{
  displayName: "Alice", // User-chosen display name (optional)
  bio: "Freelance developer", // Short bio (optional)
  escrowCount: 5, // Cached from blockchain
  lastActive: 1234567890,
  // All data here is PUBLIC and USER-SUBMITTED
  // No sensitive information stored
}
```

---

## User Experience Flow

### 1. **Connect Wallet (Login)**
```typescript
// User clicks "Connect Wallet"
const address = await connector.connect();

// That's it! User is now "logged in"
// Their address is their user ID
// Load their escrows from blockchain
const userEscrows = await factory.read.getUserEscrows([address]);
```

### 2. **View Dashboard**
```typescript
// Show user's escrows
const escrows = await factory.read.getUserEscrows([address]);

// Show statistics (calculated from blockchain events)
const events = await publicClient.getContractEvents({
  address: factoryAddress,
  abi: factoryAbi,
  eventName: 'EscrowCreated',
  args: { depositor: address }
});

const stats = {
  totalEscrows: escrows.length,
  asDepositor: events.filter(e => e.args.depositor === address).length,
  asRecipient: events.filter(e => e.args.recipient === address).length
};
```

### 3. **Create Escrow**
```typescript
// 1. User fills in form (recipient, amount, deliverable details)
const deliverable = {
  title: "Website Development",
  description: "...",
  acceptanceCriteria: ["...", "..."]
};

// 2. Generate hash of deliverable
const deliverableJson = JSON.stringify(deliverable);
const deliverableHash = keccak256(toBytes(deliverableJson));

// 3. Store deliverable in KV (authenticated by wallet signature)
await fetch('/api/documents/store', {
  method: 'POST',
  body: JSON.stringify({
    hash: deliverableHash,
    document: deliverable,
    signature: await signMessage(deliverableJson)
  })
});

// 4. Approve tokens
await mockCUSD.write.approve([factoryAddress, totalRequired]);

// 5. Create escrow on-chain
await factory.write.createEscrow([
  recipientAddress,
  amount,
  deliverableHash
]);
```

### 4. **Complete/Dispute/Resolve**
All interactions are direct contract calls - no backend needed:
```typescript
// Complete
await escrow.write.complete();

// Dispute
await escrow.write.dispute(["Reason for dispute"]);

// Resolve (admin only)
await escrow.write.resolve([favorDepositor, resolutionHash]);
```

---

## Implementation Priority

### Phase 1: Core Functionality (Weeks 1-2)
1. **Smart Contracts**: Deploy MasterFactory + EscrowContract to testnet
2. **Wallet Connection**: RainbowKit integration with MiniPay support
3. **Basic UI**: Dashboard showing user's escrows
4. **Create Escrow**: Form + contract interaction

### Phase 2: Full Escrow Flow (Weeks 3-4)
5. **View Escrow**: Detailed view with deliverable display
6. **Document Storage**: KV store for deliverables and resolutions
7. **Complete/Dispute**: User actions on escrow
8. **Mobile Optimization**: Responsive design for MiniPay

### Phase 3: Admin & Launch (Weeks 5-6)
9. **Admin Panel**: Dispute resolution interface
10. **Statistics**: Platform metrics and user statistics
11. **Production Deploy**: Mainnet deployment
12. **Testing**: End-to-end user testing

---

## Page Structure

### Public Pages
```
/                    -> Landing page (what is Gigentic Escrow)
/dashboard           -> User's escrows (requires wallet connection)
/create              -> Create new escrow (requires wallet connection)
/escrow/[address]    -> View specific escrow details (public)
/how-it-works        -> Guide/FAQ
```

### Protected Pages (Require Admin Wallet)
```
/admin               -> Admin dashboard
/admin/disputes      -> List of disputed escrows
/admin/disputes/[id] -> Resolve specific dispute
/admin/stats         -> Platform statistics
```

### Component Structure
```
components/
├── wallet/
│   ├── connect-button.tsx      -> Wallet connection UI
│   ├── wallet-provider.tsx     -> Wallet context provider
│   └── address-display.tsx     -> Format and display addresses
├── escrow/
│   ├── escrow-card.tsx         -> Escrow summary card
│   ├── escrow-list.tsx         -> List of escrows
│   ├── escrow-details.tsx      -> Full escrow information
│   ├── create-escrow-form.tsx  -> Create escrow form
│   └── escrow-actions.tsx      -> Complete/dispute buttons
├── admin/
│   ├── dispute-list.tsx        -> List disputed escrows
│   └── resolve-form.tsx        -> Resolution interface
└── ui/
    ├── button.tsx              -> shadcn/ui components
    ├── card.tsx
    ├── form.tsx
    └── ... (other UI primitives)
```

---

## Architecture Benefits

### Maximum Simplicity
- **6 API endpoints total** - minimal backend surface area
- **No user database** - blockchain IS the database
- **No authentication system** - wallet connection = login
- **No session management** - completely stateless
- **No password management** - wallets handle security
- **Factory pattern** - clean separation per escrow

### Developer Experience
- **Fast to build** - no complex auth flows
- **Easy to maintain** - minimal backend code
- **Simple to test** - wallet connection + contract calls
- **Clear mental model** - wallet address = user ID

### User Experience
- **No signup friction** - connect wallet and start
- **No password to remember** - wallet manages keys
- **Works offline** - wallet handles signing
- **Privacy first** - no personal data collection
- **Mobile friendly** - optimized for MiniPay

### Production Ready
- **Scalable** - each escrow is independent
- **Secure** - immutable on-chain records
- **Gas efficient** - hash-based documents
- **Cost effective** - minimal infrastructure

### Deployment Strategy
This architecture deploys easily on:
- **Frontend + API**: Vercel (Free tier sufficient for MVP)
- **Smart Contracts**: Celo mainnet (~$0.50 total deployment)
- **Documents**: Upstash KV (Free tier: 10K commands/day)

**Total Infrastructure Cost**: ~$0-20/month (starts at $0!)

---

## Security Considerations

### Authentication
- **Wallet signatures** verify user identity for sensitive operations
- **Contract checks** enforce access control on-chain
- **No password storage** - nothing to leak or hack

### Data Privacy
- **Deliverables are public** - anyone with hash can view
- **User addresses are public** - visible on blockchain
- **No PII collected** - wallet address is only identifier

### Admin Security
- **Admin wallet** controls dispute resolution
- **Multi-sig recommended** for production admin wallet
- **Arbiter can be changed** via updateArbiter() function

---

## Migration from v1.6

### What Changed
- ✅ **Removed**: Self Protocol integration (3 API endpoints)
- ✅ **Removed**: Identity verification KV storage
- ✅ **Removed**: Nationality/age verification features
- ✅ **Simplified**: User management (wallet-only)
- ✅ **Simplified**: API surface (6 endpoints vs 9)

### What Stayed the Same
- ✅ Factory-based escrow contracts
- ✅ Hash-based document verification
- ✅ cUSD on Celo blockchain
- ✅ Mobile-first design for MiniPay
- ✅ Admin dispute resolution

### Benefits of Simplification
1. **Faster to build** - fewer integrations, less complexity
2. **Lower costs** - no third-party service fees
3. **More private** - no KYC data collected
4. **Easier to maintain** - fewer moving parts
5. **Better UX** - no identity verification friction

---

## Example: Complete User Journey

**Alice wants to hire Bob to build a website:**

1. **Alice connects her MiniPay wallet** ✅ *Logged in automatically*
2. **Creates escrow**: $500 cUSD, describes deliverable ✅ *Approves tokens + creates escrow*
3. **Bob gets notified** (off-chain, via email/SMS) ✅ *Views escrow on blockchain*
4. **Bob delivers website** ✅ *Shares deliverable with Alice*
5. **Alice reviews and completes** ✅ *Calls escrow.complete()*
6. **Bob receives $500** ✅ *Funds transferred on-chain*
7. **Alice gets dispute bond back** ✅ *4% returned*

**Total interaction with backend: 1 API call** (store deliverable document)
**Everything else: Direct blockchain interactions**

---

*This v1.7 architecture maintains all the power of v1.6 while dramatically simplifying the implementation by removing third-party identity services. The result is a faster, cheaper, more private escrow platform that's easier to build and maintain.*

=======


# Build Gigentic Escrow v1.7 Platform

## Phase 1: Core Functionality (Foundation)

### 1. Environment & Configuration Setup

**Create environment files:**

- Create `apps/web/.env.example` with Upstash KV credentials, MasterFactory address, cUSD address, and admin wallet address
- Add `.env.local` to `.gitignore` if not already present

**Update contract configuration:**

- Replace `apps/web/src/lib/escrow-config.ts` with proper MasterFactory and EscrowContract ABIs (from compiled contracts)
- Export factory address, cUSD address from env vars
- Add TypeScript interfaces for contract data structures
- Remove old SimpleEscrow config

### 2. Dependencies & Utils

**Install required packages:**

- Add `@upstash/redis` for KV storage
- Add dependency for hash generation (viem already has keccak256)

**Create utility functions:**

- Create `apps/web/src/lib/kv.ts` - Upstash KV client singleton
- Create `apps/web/src/lib/hash.ts` - Document hashing utilities
- Create `apps/web/src/lib/wallet-auth.ts` - Wallet signature verification for API routes

### 3. Core Components

**Wallet components:**

- Create `apps/web/src/components/wallet/address-display.tsx` - Format and display addresses with copy functionality
- Update existing `connect-button.tsx` if needed for consistent styling

**Escrow components:**

- Create `apps/web/src/components/escrow/escrow-card.tsx` - Escrow summary card with state badge
- Create `apps/web/src/components/escrow/escrow-list.tsx` - Grid of escrow cards
- Create `apps/web/src/components/escrow/escrow-details.tsx` - Full escrow information display
- Create `apps/web/src/components/escrow/create-escrow-form.tsx` - Multi-step form (recipient, amount, deliverable)
- Create `apps/web/src/components/escrow/escrow-actions.tsx` - Complete/Dispute action buttons

### 4. Basic Pages

**Update home page:**

- Replace `apps/web/src/app/page.tsx` with landing page content (hero, features, CTA)

**Create dashboard:**

- Create `apps/web/src/app/dashboard/page.tsx` - User's escrows (as depositor, as recipient, filter by state)
- Show statistics: total escrows, completed, disputed

**Create escrow creation:**

- Create `apps/web/src/app/create/page.tsx` - Create new escrow page using create-escrow-form component

## Phase 2: Full Escrow Flow

### 5. Document Storage API

**Create API routes:**

- Create `apps/web/src/app/api/documents/store/route.ts` - POST endpoint to store deliverable/resolution documents in KV
- Create `apps/web/src/app/api/documents/[hash]/route.ts` - GET endpoint to retrieve document by hash
- Implement wallet signature verification for store endpoint

### 6. Escrow Detail Page

**Create detail view:**

- Create `apps/web/src/app/escrow/[address]/page.tsx` - View specific escrow details
- Display deliverable document (fetch from KV using hash)
- Show escrow state, parties, amounts, timeline
- Include escrow-actions component for Complete/Dispute

### 7. Complete Escrow Flow Implementation

**Update escrow-actions component:**

- Implement Complete button (depositor only, CREATED state)
- Implement Dispute button with reason input modal (both parties, CREATED state)
- Show appropriate UI based on user role and escrow state
- Handle transaction states with loading/success/error feedback

### 8. Mobile Optimization

**Responsive design:**

- Ensure all components work on mobile viewport
- Test with MiniPay wallet connection
- Add touch-friendly button sizes (min 44px)
- Optimize form inputs for mobile keyboards

## Phase 3: Admin & Launch

### 9. Admin API Endpoints

**Create admin routes:**

- Create `apps/web/src/app/api/admin/disputes/route.ts` - GET list of all disputed escrows
- Create `apps/web/src/app/api/admin/disputes/[id]/route.ts` - GET specific dispute details with deliverable
- Create `apps/web/src/app/api/admin/resolve/route.ts` - POST resolve dispute (calls contract)
- Create `apps/web/src/app/api/admin/stats/route.ts` - GET platform statistics
- All endpoints verify admin wallet address

### 10. Admin Components & Pages

**Create admin components:**

- Create `apps/web/src/components/admin/dispute-list.tsx` - Table of disputed escrows with filters
- Create `apps/web/src/components/admin/resolve-form.tsx` - Resolution interface (favor depositor/recipient, rationale)

**Create admin pages:**

- Create `apps/web/src/app/admin/page.tsx` - Admin dashboard overview
- Create `apps/web/src/app/admin/disputes/page.tsx` - List of disputed escrows
- Create `apps/web/src/app/admin/disputes/[id]/page.tsx` - Resolve specific dispute
- Create `apps/web/src/app/admin/stats/page.tsx` - Platform statistics dashboard
- Add middleware to check if connected wallet is admin

### 11. Statistics & User Profile

**Statistics implementation:**

- Query blockchain events for user transaction history
- Calculate user reputation from on-chain data
- Display on dashboard: escrows created, completed, disputed, success rate

**Optional user metadata:**

- Implement optional display name/bio storage in KV (keyed by address)
- Add profile edit form on dashboard
- All metadata is public and user-submitted

### 12. How It Works Page

**Create guide page:**

- Create `apps/web/src/app/how-it-works/page.tsx` - FAQ and user guide
- Explain escrow flow, fees, dispute process
- Include diagrams/illustrations
- Mobile-friendly accordion layout

### 13. Final Polish & Testing

**UI/UX refinements:**

- Add loading states for all blockchain interactions
- Error handling with user-friendly messages
- Empty states for lists (no escrows, no disputes)
- Toast notifications for successful actions

**Cleanup:**

- Remove old `escrow-interaction.tsx` component (SimpleEscrow)
- Update README with deployment instructions
- Add comments to complex logic
- Verify all TypeScript types

**Testing checklist:**

- Test wallet connection flow (MiniPay, MetaMask)
- Test create escrow end-to-end
- Test complete escrow flow
- Test dispute and resolution flow
- Test admin access control
- Test mobile responsiveness
- Test with testnet (Sepolia)

---

## Key Files to Create/Modify

**New files (~35):**

- `.env.example` (env template)
- 3 utility files (kv, hash, wallet-auth)
- 7 component files (address-display, 5 escrow components, 1 existing update)
- 2 admin component files
- 8 page files (landing, dashboard, create, escrow detail, how-it-works, 4 admin)
- 6 API route files (2 document, 4 admin)

**Modified files:**

- `escrow-config.ts` (updated ABIs and addresses)
- `page.tsx` (landing page content)

**Deleted files:**

- `escrow-interaction.tsx` (replaced by new components)

---

## Technical Decisions

1. **Document Storage**: Use Upstash KV with hash-based keys (`deliverable:{hash}`, `resolution:{hash}`)
2. **Authentication**: Wallet signatures for API writes, on-chain checks for admin operations
3. **State Management**: React Context for wallet state, blockchain as source of truth for escrow data
4. **Styling**: Tailwind + shadcn/ui components for consistency
5. **Forms**: Controlled components with client-side validation before blockchain submission
6. **Event Queries**: Use Viem's `getContractEvents` to fetch transaction history from blockchain

---

## Environment Variables Required

```bash
# apps/web/.env.local
NEXT_PUBLIC_MASTER_FACTORY_ADDRESS=0x...    # From deployment
NEXT_PUBLIC_CUSD_ADDRESS=0x...              # Sepolia: 0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b
NEXT_PUBLIC_CHAIN_ID=11142220                # Celo Sepolia testnet
ADMIN_WALLET_ADDRESS=0x...                   # Admin wallet for verification

# Upstash KV
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

---

## Success Criteria

- User can connect wallet and view dashboard
- User can create escrow with deliverable document
- User can complete/dispute escrow
- Admin can resolve disputes
- All data stored correctly (on-chain + KV)
- Mobile-friendly and responsive
- Works with MiniPay wallet
- Testnet deployment successful