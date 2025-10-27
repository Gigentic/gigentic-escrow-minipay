# Query Cache Architecture Plan
## Gigentic Escrow - TanStack Query System Design

## Table of Contents
1. [Current State Analysis](#current-state-analysis)
2. [Query Key Architecture](#query-key-architecture)
3. [Cache Organization](#cache-organization)
4. [Invalidation Strategy](#invalidation-strategy)
5. [User Flow Interactions](#user-flow-interactions)
6. [Implementation Recommendations](#implementation-recommendations)

---

## Current State Analysis

### What You Have ✓
- Centralized query key factory (`lib/queries.ts`)
- Hierarchical query key structure
- Query hooks: `useProfile`, `useEscrowDetails`, `useUserEscrows`
- Mutation hooks: `useCreateEscrow`, `useDisputeEscrow`, `useCompleteEscrow`
- Cache invalidation in mutation `onSuccess` handlers
- Parallel queries with `useQueries`

### What Needs Enhancement ⚠️
- Optimistic updates for instant UI feedback
- Block-based cache invalidation for real-time blockchain updates
- Persisted cache for offline support (optional)
- Global cache management utilities

---

## Query Key Architecture

### Hierarchical Query Key Structure

```mermaid
graph TD
    A[Root Query Keys] --> B[profiles]
    A --> C[escrows]
    A --> D[documents]
    A --> E[readContract - wagmi]
    A --> F[admin]

    B --> B1[all]
    B1 --> B2["detail(address)"]

    C --> C1[all]
    C1 --> C2[lists]
    C2 --> C3["list(filters)"]
    C1 --> C4[details]
    C4 --> C5["detail(address)"]
    C5 --> C6["detail(address) + 'dispute'"]
    C5 --> C7["detail(address) + 'resolution'"]
    C5 --> C8["detail(address) + 'listItem'"]

    D --> D1[all]
    D1 --> D2["detail(hash/address)"]

    E --> E1[chainId]
    E1 --> E2[contractAddress]
    E2 --> E3[functionName]
    E3 --> E4[args...]

    F --> F1[disputes]
    F --> F2[stats]

    style A fill:#e1f5ff
    style C fill:#fff4e1
    style E fill:#ffe1e1
```

### Enhanced Query Key Factory

```typescript
// lib/queries.ts structure (current + enhanced)
export const queryKeys = {
  // Profile queries (EXISTING)
  profiles: {
    all: ["profiles"] as const,
    detail: (address: Address) => [...queryKeys.profiles.all, address] as const,
  },

  // Escrow queries (ENHANCED)
  escrows: {
    all: ["escrows"] as const,
    lists: () => [...queryKeys.escrows.all, "list"] as const,
    list: (filters?: EscrowFilters) => [...queryKeys.escrows.lists(), filters] as const,
    details: () => [...queryKeys.escrows.all, "detail"] as const,
    detail: (address: Address) => [...queryKeys.escrows.details(), address] as const,
    // Nested queries for specific escrow data
    dispute: (address: Address) => [...queryKeys.escrows.detail(address), "dispute"] as const,
    resolution: (address: Address) => [...queryKeys.escrows.detail(address), "resolution"] as const,
    listItem: (address: Address) => [...queryKeys.escrows.detail(address), "listItem"] as const,
  },

  // Document queries (EXISTING)
  documents: {
    all: ["documents"] as const,
    detail: (hashOrAddress: string) => [...queryKeys.documents.all, hashOrAddress] as const,
  },

  // Contract read queries - wagmi (EXISTING)
  contracts: {
    all: ["readContract"] as const,
    read: (chainId: number, address: Address, functionName: string, args?: readonly unknown[]) =>
      [...queryKeys.contracts.all, chainId, address, functionName, ...(args || [])] as const,
  },

  // Admin queries (EXISTING)
  admin: {
    all: ["admin"] as const,
    disputes: () => [...queryKeys.admin.all, "disputes"] as const,
    stats: () => [...queryKeys.admin.all, "stats"] as const,
  },
};
```

---

## Cache Organization

### Data Flow Architecture

```mermaid
graph LR
    subgraph "Data Sources"
        A[Blockchain<br/>Celo Network]
        B[Backend API<br/>Next.js Routes]
        C[KV Store<br/>Upstash]
    end

    subgraph "Query Cache"
        D[Profile Queries]
        E[Escrow Queries]
        F[Document Queries]
        G[Wagmi Queries]
    end

    subgraph "UI Components"
        H[Dashboard]
        I[Escrow Details]
        J[Profile]
        K[Admin Panel]
    end

    A -->|useReadContract| G
    A -->|usePublicClient| E
    B -->|fetch| D
    C -->|fetch| F

    G --> E
    E --> H
    E --> I
    D --> J
    D --> H
    F --> I

    style A fill:#e1f5ff
    style B fill:#fff4e1
    style C fill:#ffe1e1
```

### Cache Configuration Strategy

```typescript
// Recommended cache times by data type
const CACHE_TIMES = {
  // Profile data - medium lived, user controlled
  profile: {
    staleTime: 1000 * 60 * 5,     // Fresh for 5 min
    gcTime: 1000 * 60 * 30,       // Keep in cache for 30 min
  },

  // Escrow data - short lived, blockchain state
  escrowDetails: {
    staleTime: 5_000,              // Fresh for 5 seconds
    gcTime: 1000 * 60 * 10,        // Keep in cache for 10 min
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 10_000,       // Poll every 10 seconds when active
  },

  // List data - very short lived, frequently changes
  escrowList: {
    staleTime: 5_000,              // Fresh for 5 seconds
    gcTime: 1000 * 60 * 5,         // Keep in cache for 5 min
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  },

  // Document data - long lived, immutable content
  documents: {
    staleTime: 1000 * 60 * 60,     // Fresh for 1 hour
    gcTime: 1000 * 60 * 60 * 24,   // Keep in cache for 24 hours
  },

  // Contract reads - very short lived, blockchain state
  contractReads: {
    staleTime: 5_000,              // Fresh for 5 seconds
    gcTime: 1000 * 60 * 5,         // Keep in cache for 5 min
    refetchOnMount: true,
  },
};
```

---

## Invalidation Strategy

### Cache Invalidation Flow

```mermaid
graph TD
    A[User Action] --> B{Mutation Type}

    B -->|Update Profile| C[Profile Mutation]
    B -->|Create Escrow| D[Escrow Creation]
    B -->|Dispute| E[Dispute Mutation]
    B -->|Complete| F[Complete Mutation]
    B -->|Resolve| G[Resolve Mutation]
    B -->|Sign Out| H[Disconnect Wallet]

    C --> C1["Invalidate: profiles.detail(address)"]
    C --> C2["Set: new profile data"]

    D --> D1["Invalidate: ALL readContract"]
    D --> D2["Invalidate: getUserEscrows query"]
    D --> D3["Invalidate: escrows.lists()"]
    D --> D4["Wait 500ms for chain propagation"]
    D --> D5["Navigate to new escrow"]

    E --> E1["Invalidate: escrows.detail(address)"]
    E --> E2["Invalidate: dispute sub-query"]
    E --> E3["Invalidate: documents.detail()"]
    E --> E4["Invalidate: readContract"]
    E --> E5["Wait 1000ms for propagation"]
    E --> E6["Refetch: all escrow queries"]

    F --> F1["Invalidate: escrows.detail(address)"]
    F --> F2["Invalidate: dispute sub-query"]
    F --> F3["Invalidate: readContract"]
    F --> F4["Wait 1000ms for propagation"]
    F --> F5["Refetch: all escrow queries"]

    G --> G1["Invalidate: escrows.detail(address)"]
    G --> G2["Invalidate: resolution sub-query"]
    G --> G3["Invalidate: admin.disputes()"]
    G --> G4["Invalidate: readContract"]

    H --> H1["Clear: profiles.detail()"]
    H --> H2["Clear: escrows.lists()"]
    H --> H3["Disconnect wallet"]
    H --> H4["Clear session cookie via API"]

    style A fill:#e1f5ff
    style D fill:#fff4e1
    style E fill:#ffe1f1
    style F fill:#e1ffe1
```

### Invalidation Patterns by Scope

```mermaid
graph LR
    subgraph "Invalidation Scopes"
        A[Global Invalidation]
        B[User-Scoped Invalidation]
        C[Escrow-Scoped Invalidation]
        D[Document-Scoped Invalidation]
    end

    A --> A1["Sign Out<br/>Clear ALL cache"]
    A --> A2["Chain Switch<br/>Invalidate ALL contracts"]
    A --> A3["Account Change<br/>Invalidate user data"]

    B --> B1["Profile Update<br/>Invalidate profile(address)"]
    B --> B2["Create Escrow<br/>Invalidate user lists"]

    C --> C1["Complete Escrow<br/>Invalidate escrow.detail()"]
    C --> C2["Dispute<br/>Invalidate dispute queries"]
    C --> C3["Resolve<br/>Invalidate resolution queries"]

    D --> D1["Store Document<br/>Invalidate document.detail()"]

    style A fill:#ffe1e1
    style B fill:#e1f5ff
    style C fill:#fff4e1
    style D fill:#e1ffe1
```

---

## User Flow Interactions

### 1. Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Cache
    participant Wallet
    participant API

    User->>UI: Connect Wallet
    UI->>Wallet: Request Connection
    Wallet-->>UI: Address + Chain

    Note over UI: useAccount() from wagmi<br/>provides wallet state

    UI->>API: Request SIWE nonce
    API-->>UI: Return nonce

    UI->>Wallet: Sign SIWE message
    Wallet-->>UI: Signed message

    UI->>API: Verify signature
    API->>API: Set session cookie
    API-->>UI: Success

    UI->>Cache: Fetch useProfile(address)
    Cache->>API: GET /api/profile/:address
    API-->>Cache: Profile data
    Cache-->>UI: Profile cached

    UI-->>User: Authenticated + Profile loaded

    Note over Cache,API: Session managed by cookie<br/>No auth query caching needed
```

### 2. Dashboard Flow

```mermaid
sequenceDiagram
    participant User
    participant Dashboard
    participant Cache
    participant Blockchain
    participant API

    User->>Dashboard: Navigate to /dashboard

    Note over Dashboard: useAccount() provides<br/>wallet address

    Dashboard->>Cache: Query getUserEscrows(address)

    alt Cache hit (fresh)
        Cache-->>Dashboard: Cached escrow addresses
    else Cache miss or stale
        Cache->>Blockchain: readContract: getUserEscrows
        Blockchain-->>Cache: Address array
        Cache-->>Dashboard: Escrow addresses
    end

    Dashboard->>Cache: Query useUserEscrows(addresses)

    par Parallel Escrow Queries
        Cache->>Blockchain: getDetails(escrow1)
        Cache->>Blockchain: getDetails(escrow2)
        Cache->>Blockchain: getDetails(escrow3)
        Cache->>API: fetch deliverable(escrow1)
        Cache->>API: fetch deliverable(escrow2)
        Cache->>API: fetch deliverable(escrow3)
    end

    Blockchain-->>Cache: Escrow details
    API-->>Cache: Deliverable titles

    Cache-->>Dashboard: Progressive render
    Dashboard-->>User: Show escrows as they load
```

### 3. Create Escrow Flow

```mermaid
sequenceDiagram
    participant User
    participant Form
    participant Cache
    participant Wallet
    participant Blockchain
    participant API

    User->>Form: Fill escrow details
    User->>Form: Submit

    Form->>Cache: useCreateEscrow mutation

    Cache->>Blockchain: Check cUSD allowance
    Blockchain-->>Cache: Current allowance

    alt Allowance insufficient
        Cache->>Wallet: Request approval
        Wallet-->>User: Confirm approval
        User-->>Wallet: Approve
        Wallet->>Blockchain: approve(amount)
        Blockchain-->>Cache: Approval confirmed
    end

    Cache->>Wallet: Request escrow creation
    Wallet-->>User: Confirm transaction
    User-->>Wallet: Confirm
    Wallet->>Blockchain: createEscrow(...)
    Blockchain-->>Cache: Tx receipt + escrow address

    Cache->>API: Store deliverable document
    API-->>Cache: Document stored

    Note over Cache: onSuccess Handler
    Cache->>Cache: Invalidate readContract(getUserEscrows)
    Cache->>Cache: Invalidate escrows.lists()
    Cache->>Cache: Invalidate escrows.detail(newAddress)

    Cache->>Blockchain: Refetch getUserEscrows
    Blockchain-->>Cache: Updated address list

    Cache-->>Form: Creation complete
    Form-->>User: Navigate to new escrow
```

### 4. Dispute Flow

```mermaid
sequenceDiagram
    participant User
    participant EscrowPage
    participant Cache
    participant Wallet
    participant Blockchain
    participant API

    User->>EscrowPage: View escrow details
    EscrowPage->>Cache: useEscrowDetails(address)

    par Parallel Queries
        Cache->>Blockchain: getDetails()
        Cache->>API: fetch deliverable
        Cache->>Blockchain: getDisputeInfo()
    end

    Blockchain-->>Cache: Escrow details
    API-->>Cache: Deliverable
    Blockchain-->>Cache: No dispute yet

    Cache-->>EscrowPage: Display escrow

    User->>EscrowPage: Click "Raise Dispute"
    User->>EscrowPage: Enter dispute reason
    User->>EscrowPage: Submit

    EscrowPage->>Cache: useDisputeEscrow mutation

    Cache->>API: Store dispute document
    API-->>Cache: Document stored + hash

    Cache->>Wallet: Request dispute tx
    Wallet-->>User: Confirm transaction
    User-->>Wallet: Confirm
    Wallet->>Blockchain: dispute(hash)
    Blockchain-->>Cache: Tx confirmed

    Note over Cache: Wait 1000ms for propagation

    Note over Cache: onSuccess Handler
    Cache->>Cache: Invalidate escrows.detail(address)
    Cache->>Cache: Invalidate dispute sub-query
    Cache->>Cache: Invalidate documents.detail()
    Cache->>Cache: Invalidate readContract

    Cache->>Blockchain: Refetch all escrow queries
    Blockchain-->>Cache: Updated state (DISPUTED)

    Cache->>API: Refetch documents
    API-->>Cache: Dispute document

    Cache-->>EscrowPage: Updated UI (dispute visible)
```

### 5. Complete Escrow Flow

```mermaid
sequenceDiagram
    participant User
    participant EscrowPage
    participant Cache
    participant Wallet
    participant Blockchain

    User->>EscrowPage: View escrow (depositor)
    EscrowPage->>Cache: useEscrowDetails(address)
    Cache-->>EscrowPage: Escrow in CREATED state

    User->>EscrowPage: Click "Complete Escrow"
    User->>EscrowPage: Confirm action

    EscrowPage->>Cache: useCompleteEscrow mutation

    Cache->>Wallet: Request complete tx
    Wallet-->>User: Confirm transaction
    User-->>Wallet: Confirm
    Wallet->>Blockchain: complete()
    Blockchain-->>Cache: Tx confirmed

    Note over Cache: Wait 1000ms for propagation

    Note over Cache: onSuccess Handler
    Cache->>Cache: Invalidate escrows.detail(address)
    Cache->>Cache: Invalidate dispute sub-query
    Cache->>Cache: Invalidate readContract

    Cache->>Blockchain: Refetch all escrow queries
    Blockchain-->>Cache: Updated state (COMPLETED)

    Cache-->>EscrowPage: Updated UI (completed status)
    EscrowPage-->>User: Show success + bond returned
```

### 6. Sign Out Flow

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Cache
    participant Wallet
    participant API

    User->>UI: Click "Sign Out"

    UI->>API: POST /api/auth/logout
    API->>API: Clear session cookie
    API-->>UI: Success

    UI->>Cache: Clear profiles.detail(address)
    UI->>Cache: Clear escrows.lists()

    UI->>Wallet: disconnect() via wagmi
    Wallet-->>UI: Disconnected

    UI-->>User: Redirect to landing page

    Note over Cache: Session cleared via cookie<br/>Profile/escrow cache cleared<br/>Wallet disconnected
```

---

## Implementation Recommendations

### 1. Add Global Cache Utilities

```typescript
// lib/cache-utils.ts (NEW)
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './queries';
import type { Address } from 'viem';

export class CacheManager {
  constructor(private queryClient: QueryClient) {}

  /**
   * Clear all user-specific data on sign out or account change
   */
  clearUserData(address: Address) {
    this.queryClient.removeQueries({ queryKey: queryKeys.profiles.detail(address) });
    this.queryClient.removeQueries({ queryKey: queryKeys.escrows.lists() });
  }

  /**
   * Invalidate all blockchain data (for chain switches or reconnects)
   */
  async invalidateBlockchainData() {
    await this.queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all });
    await this.queryClient.invalidateQueries({ queryKey: queryKeys.escrows.all });
  }

  /**
   * Invalidate all queries for a specific escrow
   */
  async invalidateEscrow(address: Address) {
    await this.queryClient.invalidateQueries({
      queryKey: queryKeys.escrows.detail(address),
      exact: false, // Include all nested queries
    });
  }

  /**
   * Optimistically update an escrow's state
   */
  setEscrowStateOptimistic(address: Address, newState: number) {
    this.queryClient.setQueryData(
      queryKeys.escrows.detail(address),
      (old: any) => {
        if (!old) return old;
        return { ...old, state: newState };
      }
    );
  }

  /**
   * Prefetch escrow details before navigation
   */
  async prefetchEscrow(address: Address, publicClient: any) {
    await this.queryClient.prefetchQuery({
      queryKey: queryKeys.escrows.detail(address),
      queryFn: async () => {
        const details = await publicClient.readContract({
          address,
          abi: ESCROW_CONTRACT_ABI,
          functionName: 'getDetails',
        });
        return parseEscrowDetails(details);
      },
    });
  }
}

// Export singleton instance
export const createCacheManager = (queryClient: QueryClient) =>
  new CacheManager(queryClient);
```

### 2. Add Optimistic Updates

```typescript
// Enhanced mutation with optimistic update
export function useCompleteEscrow(options?: {
  onSuccess?: (data: { txHash: `0x${string}` }, escrowAddress: Address) => void;
  onError?: (error: Error) => void;
}) {
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (escrowAddress: Address) => {
      // ... existing mutation logic
    },

    // NEW: Optimistic update
    onMutate: async (escrowAddress) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.escrows.detail(escrowAddress),
      });

      // Snapshot current value
      const previousDetails = queryClient.getQueryData(
        queryKeys.escrows.detail(escrowAddress)
      );

      // Optimistically update to COMPLETED state (3)
      queryClient.setQueryData(
        queryKeys.escrows.detail(escrowAddress),
        (old: any) => {
          if (!old) return old;
          return { ...old, state: 3 }; // 3 = COMPLETED
        }
      );

      // Return context with snapshot
      return { previousDetails };
    },

    // NEW: Rollback on error
    onError: (error, escrowAddress, context) => {
      // Rollback to previous value
      if (context?.previousDetails) {
        queryClient.setQueryData(
          queryKeys.escrows.detail(escrowAddress),
          context.previousDetails
        );
      }

      if (options?.onError) {
        options.onError(error);
      }
    },

    onSuccess: async (data, escrowAddress) => {
      // ... existing success logic
    },
  });

  return mutation;
}
```

### 3. Add Block-Based Invalidation

```typescript
// hooks/use-block-watcher.ts (NEW)
import { useBlockNumber } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { queryKeys } from '@/lib/queries';

/**
 * Watch for new blocks and invalidate escrow queries
 * This ensures UI stays in sync with blockchain state
 */
export function useBlockWatcher(enabled = true) {
  const { data: blockNumber } = useBlockNumber({
    watch: enabled,
    pollingInterval: 5_000, // Check every 5 seconds
  });
  const queryClient = useQueryClient();
  const previousBlock = useRef<bigint>();

  useEffect(() => {
    if (!blockNumber || !enabled) return;

    // Skip first run
    if (previousBlock.current === undefined) {
      previousBlock.current = blockNumber;
      return;
    }

    // New block detected
    if (blockNumber !== previousBlock.current) {
      console.log(`New block: ${blockNumber}`);

      // Invalidate all escrow queries (they may have changed)
      queryClient.invalidateQueries({
        queryKey: queryKeys.escrows.all,
        refetchType: 'active', // Only refetch active queries
      });

      // Invalidate contract reads
      queryClient.invalidateQueries({
        queryKey: queryKeys.contracts.all,
        refetchType: 'active',
      });

      previousBlock.current = blockNumber;
    }
  }, [blockNumber, enabled, queryClient]);
}
```

### 4. Add Cache Persistence (Optional)

```typescript
// lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 1000 * 60 * 60 * 24, // 24 hours
      },
    },
  });
}

export const persister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  key: 'gigentic-query-cache',
  serialize: (data) => JSON.stringify(data),
  deserialize: (data) => JSON.parse(data),
});

// Use in wallet-provider.tsx:
// <PersistQueryClientProvider
//   client={queryClient}
//   persistOptions={{ persister }}
// >
//   {children}
// </PersistQueryClientProvider>
```

### 5. Add Query Devtools Setup

```typescript
// components/query-devtools.tsx (NEW)
'use client';

import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export function QueryDevtools() {
  return (
    <ReactQueryDevtools
      initialIsOpen={false}
      position="bottom-right"
      buttonPosition="bottom-right"
    />
  );
}

// Add to layout.tsx:
// {process.env.NODE_ENV === 'development' && <QueryDevtools />}
```

---

## Summary

### Key Principles

1. **Hierarchical Query Keys**: Use nested keys for easy invalidation
2. **Granular Invalidation**: Only invalidate what changed
3. **Optimistic Updates**: Update UI immediately, rollback on error
4. **Progressive Loading**: Show data as it arrives
5. **Block Watching**: Auto-refresh on new blocks
6. **Cache Persistence**: Save cache to localStorage (optional)
7. **Type Safety**: Use TypeScript for all query keys and data

### Data Flow Patterns

```mermaid
graph LR
    A[User Action] --> B[Mutation]
    B --> C[Optimistic Update]
    B --> D[Blockchain/API Call]
    D -->|Success| E[Invalidate Cache]
    D -->|Error| F[Rollback Optimistic]
    E --> G[Refetch Queries]
    G --> H[UI Update]
    F --> H

    style A fill:#e1f5ff
    style C fill:#fff4e1
    style E fill:#e1ffe1
    style F fill:#ffe1e1
```

### Cache Invalidation Decision Tree

```mermaid
graph TD
    A[Mutation Complete] --> B{What Changed?}

    B -->|Profile Data| C["Invalidate: profiles.detail()"]
    B -->|Escrow Created| D["Invalidate: lists, getUserEscrows"]
    B -->|Escrow State| E["Invalidate: escrow.detail()"]
    B -->|Document Stored| F["Invalidate: documents.detail()"]

    E --> G{Specific State?}
    G -->|Disputed| H["Also invalidate: dispute sub-query"]
    G -->|Completed| I["Also invalidate: user lists"]
    G -->|Resolved| J["Also invalidate: resolution, admin queries"]

    D --> K["Wait for chain propagation"]
    E --> K
    K --> L["Refetch active queries"]
    L --> M[UI Updates]

    style A fill:#e1f5ff
    style K fill:#fff4e1
    style M fill:#e1ffe1
```

---

## Next Steps

1. ✅ Review this architecture with your team
2. [ ] Add `cache-utils.ts` utilities
3. [ ] Enhance mutation hooks with optimistic updates
4. [ ] Add `use-block-watcher.ts` for real-time updates
5. [ ] Consider cache persistence for offline support (optional)
6. [ ] Add React Query Devtools for debugging
7. [ ] Update all mutation hooks to use new invalidation patterns
8. [ ] Test cache invalidation flows thoroughly
9. [ ] Monitor cache performance and adjust stale times

---

**Last Updated**: 2025-10-27
**Version**: 1.0
**Author**: Claude Code
