# Gigentic Escrow Platform Architecture v1.6
## Requirements & Implementation Guide

This document outlines the platform architecture needed for the Gigentic Escrow project, covering milestones 2-4 implementation. We're building on the Celo Composer Kit Next.js skeleton with mobile optimization for MiniPay and Valora wallets.

## Key Design Principles
- **Simplicity First**: Minimal backend, maximum on-chain functionality
- **Mobile Optimized**: Built for MiniPay and Valora wallet users
- **Factory Pattern**: Individual escrow contracts deployed via master factory
- **Hash-Based Documents**: Off-chain storage with on-chain hash verification
- **Optional Identity**: Self Protocol integration for trust enhancement

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
│   └── Profile (Self verification)
├── API Routes (Next.js)
│   ├── Self Protocol integration (3 endpoints)
│   ├── Admin operations (4 endpoints)
│   └── Document management (hash storage)
├── Contract Interactions
│   ├── MasterFactory (escrow creation, registry)
│   └── EscrowContract instances (funds, disputes)
└── Off-chain Storage (Upstash KV)
    ├── Deliverable documents (by hash)
    ├── Resolution documents (by hash)
    └── Self verification status (by address)
```

**Why this architecture:**
- **Factory Pattern**: Each escrow gets its own contract instance for gas efficiency
- **Hash Verification**: Documents stored off-chain but verified on-chain via hashes
- **Minimal Backend**: Only for Self Protocol integration and admin operations
- **Mobile First**: Optimized for MiniPay/Valora wallet integration

### 2. **User Management - Wallet-Only Authentication**

**Authentication Model:**
- Users identified solely by wallet address (Valora, MiniPay, MetaMask)
- No traditional user accounts, passwords, or sessions
- Wallet signature provides authentication when needed

**User State Management:**
- **Persistent Data**: Contract events + KV store for verification status
- **Session Data**: React Context for current wallet connection
- **Preferences**: localStorage (theme, language) - no server storage needed

### 3. **Self Protocol Integration - Public Trust Signals**

**Architecture:**
```javascript
// KV Store Structure
{
  // Temporary verification sessions (10min expiry)
  "session:abc123": {
    address: "0x742d...",
    status: "pending",
    createdAt: 1234567890
  },
  
  // Permanent verification status (per wallet)
  "verified:0x742d...": {
    verified: true,
    nationality: "US", // Private - not exposed publicly
    timestamp: 1234567890
  }
}
```

**Trust Model:**
- **Public**: Verification status (✅ verified / not verified)
- **Private**: Personal details (nationality, age verification)
- **Purpose**: Enable informed trust decisions in escrow creation

### 4. **API Design**

**Self Protocol Integration (3 endpoints):**
```javascript
POST /api/self/initiate        // Start verification, generate QR config
POST /api/self/verify          // Self Protocol callback (PUBLIC)
GET  /api/self/status/[address] // Check verification status (PUBLIC)
GET  /api/self/details/[address] // Full details (PROTECTED - owner/admin only)
```

**Admin Operations (4 endpoints):**
```javascript
GET  /api/admin/disputes       // List all disputed escrows
GET  /api/admin/disputes/[id]  // Get specific dispute details
POST /api/admin/resolve        // Resolve dispute (calls contract)
GET  /api/admin/stats          // Platform statistics
```

**Document Management (2 endpoints):**
```javascript
POST /api/documents/store      // Store deliverable/resolution documents
GET  /api/documents/[hash]     // Retrieve document by hash
```

**Why this API structure:**
- **Self Integration**: Complete verification flow with privacy controls
- **Admin Tools**: Enable dispute management and platform monitoring
- **Document Storage**: Hash-based document verification system

## Recommended Tech Stack

### Core Technologies

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Smart Contracts** | Solidity 0.8.x | Factory + escrow logic |
| **Blockchain** | Celo | Low-cost, mobile-first chain |
| **Currency** | cUSD | Stable token for escrow amounts |
| **Frontend** | Next.js 14 | React framework with API routes |
| **Styling** | Tailwind CSS | Utility-first styling |
| **State Management** | React Context | Simple state management |
| **Wallet Connection** | Celo Composer Kit | Multi-wallet support (Valora, MiniPay, MetaMask) |
| **Storage** | Upstash KV | Document + verification storage |
| **Hosting** | Vercel | Frontend and API hosting |
| **Identity** | Self Protocol | Optional identity verification |

### What you DON'T need:
- ❌ SQL database (blockchain + KV is sufficient)
- ❌ Traditional user authentication (wallet-only)
- ❌ Backend server (Next.js API routes only)
- ❌ Complex state management (React Context + localStorage)
- ❌ Session management (stateless API)

## Data Storage Strategy

| Data Type | Storage Location | Access Pattern | Why |
|-----------|-----------------|----------------|-----|
| **Core escrow data** | Smart Contracts | Public reads | Business logic, immutable |
| **Deliverable documents** | KV Store (by hash) | Hash-verified | Gas efficiency, detailed specs |
| **Resolution documents** | KV Store (by hash) | Hash-verified | Arbitration records |
| **Self verification** | KV Store (by address) | Public status, private details | Trust signals |
| **User preferences** | localStorage | Client-only | Theme, language, per-device |
| **Contract events** | Blockchain | Event queries | Immutable history |
| **Admin config** | Environment vars | Server-only | Simple configuration |

### KV Store Schema Examples

**Deliverable Document:**
```typescript
// Key: deliverable:{hash}
{
  title: "Website Development",
  description: "Build landing page...",
  acceptanceCriteria: ["Responsive design", "SEO optimized"],
  escrowAddress: "0x123...",
  depositor: "0x456...",
  recipient: "0x789...",
  amount: "1000",
  createdAt: 1234567890
}
```

**Resolution Document:**
```typescript
// Key: resolution:{hash}
{
  escrowAddress: "0x123...",
  arbiter: "0xabc...",
  favorDepositor: false,
  disputeReason: "Work not completed",
  decisionRationale: "Deliverables met acceptance criteria",
  resolvedAt: 1234567890
}
```

## Implementation Priority

### Milestone 2: Platform Development
1. **Core UI**: Dashboard, create escrow, view escrow flows
2. **Factory Integration**: Connect UI to MasterFactory contract
3. **Document System**: Hash-based deliverable storage
4. **Mobile Optimization**: Responsive design for MiniPay/Valora

### Milestone 3: Identity & Wallet Integration  
5. **Self Protocol**: Complete verification flow integration
6. **Multi-wallet Support**: Valora, MiniPay, MetaMask compatibility
7. **Trust Signals**: Public verification status display
8. **Pilot Testing**: 10 documented user tests

### Milestone 4: Launch & Growth
9. **API Endpoints**: Complete admin and public API
10. **Production Deployment**: Mainnet contracts + frontend
11. **Real Users**: 20+ successful transactions
12. **Community**: Celo forum announcement

## Architecture Benefits

### Simplicity Wins
- **No backend server** - Next.js API routes handle all backend needs
- **No user database** - Wallet addresses are primary user identifiers
- **No complex auth** - Wallet signatures provide authentication
- **Minimal KV usage** - Only for documents and verification status
- **Factory pattern** - Individual contracts for each escrow, clean separation

### Production Ready
- **Mobile First** - Optimized for MiniPay and Valora wallet users
- **Gas Efficient** - Hash-based documents, factory deployment pattern
- **Scalable** - Each escrow is independent, KV store handles off-chain data
- **Secure** - Hash verification, immutable on-chain records

### Deployment Strategy
This architecture deploys easily on:
- **Frontend + API**: Vercel (with Upstash KV addon)
- **Smart Contracts**: Celo mainnet (low gas costs)
- **Documents**: KV store (hash-verified integrity)
- **Identity**: Self Protocol (optional trust enhancement)

**Total Infrastructure Cost**: ~$20-50/month for production workload

---

*This platform architecture provides everything needed for milestones 2-4 while maintaining the simplicity principle. The factory-based smart contract design combined with hash-verified off-chain storage creates a production-ready escrow platform optimized for mobile users in emerging markets.*