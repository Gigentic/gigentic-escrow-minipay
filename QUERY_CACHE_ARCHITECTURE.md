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
- Authentication flow integration (SIWE) with query cache
- Optimistic updates for instant UI feedback
- Query key consistency across wagmi and custom queries
- Block-based cache invalidation for real-time blockchain updates
- Persisted cache for offline support
- Global cache management utilities

---

## Query Key Architecture

### Hierarchical Query Key Structure

```mermaid
graph TD
    A[Root Query Keys] --> B[auth]
    A --> C[profiles]
    A --> D[escrows]
    A --> E[documents]
    A --> F[readContract - wagmi]
    A --> G[admin]

    B --> B1[session]
    B --> B2[nonce]

    C --> C1[all]
    C1 --> C2["detail(address)"]

    D --> D1[all]
    D1 --> D2[lists]
    D2 --> D3["list(filters)"]
    D1 --> D4[details]
    D4 --> D5["detail(address)"]
    D5 --> D6["detail(address) + 'dispute'"]
    D5 --> D7["detail(address) + 'resolution'"]
    D5 --> D8["detail(address) + 'listItem'"]

    E --> E1[all]
    E1 --> E2["detail(hash/address)"]

    F --> F1[chainId]
    F1 --> F2[contractAddress]
    F2 --> F3[functionName]
    F3 --> F4[args...]

    G --> G1[disputes]
    G --> G2[stats]

    style A fill:#e1f5ff
    style D fill:#fff4e1
    style F fill:#ffe1e1
    style B fill:#e1ffe1
```

### Enhanced Query Key Factory

```typescript
// Enhanced lib/queries.ts structure
export const queryKeys = {
  // Authentication queries (NEW)
  auth: {
    all: ["auth"] as const,
    session: () => [...queryKeys.auth.all, "session"] as const,
    nonce: (address: Address) => [...queryKeys.auth.all, "nonce", address] as const,
  },

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
        D[Auth Queries]
        E[Profile Queries]
        F[Escrow Queries]
        G[Document Queries]
        H[Wagmi Queries]
    end

    subgraph "UI Components"
        I[Dashboard]
        J[Escrow Details]
        K[Profile]
        L[Admin Panel]
    end

    A -->|useReadContract| H
    A -->|usePublicClient| F
    B -->|fetch| E
    B -->|fetch| D
    C -->|fetch| G

    H --> F
    F --> I
    F --> J
    E --> K
    E --> I
    G --> J
    D --> I
    D --> K

    style A fill:#e1f5ff
    style B fill:#fff4e1
    style C fill:#ffe1e1
```

### Cache Configuration Strategy

```typescript
// Recommended cache times by data type
const CACHE_TIMES = {
  // Auth data - short lived, security sensitive
  auth: {
    staleTime: 0,           // Always revalidate
    gcTime: 1000 * 60 * 5,  // Keep in cache for 5 min
  },

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

    B -->|Sign In| C[Auth Mutation]
    B -->|Update Profile| D[Profile Mutation]
    B -->|Create Escrow| E[Escrow Creation]
    B -->|Dispute| F[Dispute Mutation]
    B -->|Complete| G[Complete Mutation]
    B -->|Resolve| H[Resolve Mutation]
    B -->|Sign Out| I[Sign Out Mutation]

    C --> C1["Invalidate: auth.session"]
    C --> C2["Invalidate: profiles.detail(address)"]
    C --> C3["Set: auth data"]

    D --> D1["Invalidate: profiles.detail(address)"]
    D --> D2["Set: new profile data"]

    E --> E1["Invalidate: ALL readContract"]
    E --> E2["Invalidate: getUserEscrows query"]
    E --> E3["Invalidate: escrows.lists()"]
    E --> E4["Wait 500ms for chain propagation"]
    E --> E5["Navigate to new escrow"]

    F --> F1["Invalidate: escrows.detail(address)"]
    F --> F2["Invalidate: dispute sub-query"]
    F --> F3["Invalidate: documents.detail()"]
    F --> F4["Invalidate: readContract"]
    F --> F5["Wait 1000ms for propagation"]
    F --> F6["Refetch: all escrow queries"]

    G --> G1["Invalidate: escrows.detail(address)"]
    G --> G2["Invalidate: dispute sub-query"]
    G --> G3["Invalidate: readContract"]
    G --> G4["Wait 1000ms for propagation"]
    G --> G5["Refetch: all escrow queries"]

    H --> H1["Invalidate: escrows.detail(address)"]
    H --> H2["Invalidate: resolution sub-query"]
    H --> H3["Invalidate: admin.disputes()"]
    H --> H4["Invalidate: readContract"]

    I --> I1["Clear: auth.session"]
    I --> I2["Clear: profiles.detail()"]
    I --> I3["Disconnect wallet"]
    I --> I4["Clear ALL user-specific data"]

    style A fill:#e1f5ff
    style E fill:#fff4e1
    style F fill:#ffe1f1
    style G fill:#e1ffe1
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

    UI->>Cache: Check auth.session
    Cache-->>UI: No session / stale

    UI->>API: Request SIWE nonce
    API-->>Cache: Store nonce in auth.nonce(address)
    API-->>UI: Return nonce

    UI->>Wallet: Sign SIWE message
    Wallet-->>UI: Signed message

    UI->>API: Verify signature
    API-->>UI: JWT token

    UI->>Cache: Set auth.session
    UI->>Cache: Invalidate profiles.detail(address)

    Cache->>API: Fetch profile
    API-->>Cache: Store profile
    Cache-->>UI: Profile data

    UI-->>User: Authenticated + Profile loaded
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

    Dashboard->>Cache: Query auth.session
    Cache-->>Dashboard: Session data

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

    UI->>Cache: useSignOut mutation

    Cache->>API: POST /api/auth/logout
    API->>API: Clear session cookie
    API-->>Cache: Success

    Cache->>Cache: Clear auth.session
    Cache->>Cache: Clear auth.nonce
    Cache->>Cache: Clear profiles.detail(address)
    Cache->>Cache: Clear escrows.lists()
    Cache->>Cache: Optional: Clear ALL user data

    Cache->>Wallet: disconnect()
    Wallet-->>Cache: Disconnected

    Cache-->>UI: Sign out complete
    UI-->>User: Redirect to landing page
```

---

## Implementation Recommendations

### 1. Add Authentication Queries

```typescript
// hooks/use-auth.ts (NEW)
export function useAuth() {
  const { address } = useAccount();
  const queryClient = useQueryClient();

  // Check session
  const sessionQuery = useQuery({
    queryKey: queryKeys.auth.session(),
    queryFn: async () => {
      const response = await fetch('/api/auth/session');
      if (!response.ok) return null;
      return response.json();
    },
    staleTime: 0, // Always revalidate
    gcTime: 1000 * 60 * 5,
  });

  // Sign in mutation
  const signInMutation = useMutation({
    mutationFn: async (signature: `0x${string}`) => {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature }),
      });
      if (!response.ok) throw new Error('Sign in failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.session() });
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.detail(address!) });
    },
  });

  // Sign out mutation
  const signOutMutation = useMutation({
    mutationFn: async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
    },
    onSuccess: () => {
      // Clear ALL user-specific cache
      queryClient.removeQueries({ queryKey: queryKeys.auth.all });
      queryClient.removeQueries({ queryKey: queryKeys.profiles.detail(address!) });
      queryClient.removeQueries({ queryKey: queryKeys.escrows.lists() });
    },
  });

  return {
    session: sessionQuery.data,
    isAuthenticated: !!sessionQuery.data,
    isLoading: sessionQuery.isLoading,
    signIn: signInMutation.mutate,
    signOut: signOutMutation.mutate,
  };
}
```

### 2. Add Global Cache Utilities

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
    this.queryClient.removeQueries({ queryKey: queryKeys.auth.all });
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

### 3. Add Optimistic Updates

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

### 4. Add Block-Based Invalidation

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

### 5. Add Cache Persistence (Optional)

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

### 6. Add Query Devtools Setup

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

    B -->|User Auth| C["Invalidate: auth, profiles"]
    B -->|Profile Data| D["Invalidate: profiles.detail()"]
    B -->|Escrow Created| E["Invalidate: lists, getUserEscrows"]
    B -->|Escrow State| F["Invalidate: escrow.detail()"]
    B -->|Document Stored| G["Invalidate: documents.detail()"]

    F --> H{Specific State?}
    H -->|Disputed| I["Also invalidate: dispute sub-query"]
    H -->|Completed| J["Also invalidate: user lists"]
    H -->|Resolved| K["Also invalidate: resolution, admin queries"]

    E --> L["Wait for chain propagation"]
    F --> L
    L --> M["Refetch active queries"]
    M --> N[UI Updates]

    style A fill:#e1f5ff
    style L fill:#fff4e1
    style N fill:#e1ffe1
```

---

## Next Steps

1. ✅ Review this architecture with your team
2. [ ] Implement `use-auth.ts` hook
3. [ ] Add `cache-utils.ts` utilities
4. [ ] Enhance mutation hooks with optimistic updates
5. [ ] Add `use-block-watcher.ts` for real-time updates
6. [ ] Consider cache persistence for offline support
7. [ ] Add React Query Devtools for debugging
8. [ ] Update all mutation hooks to use new invalidation patterns
9. [ ] Test cache invalidation flows thoroughly
10. [ ] Monitor cache performance and adjust stale times

---

**Last Updated**: 2025-10-27
**Version**: 1.0
**Author**: Claude Code
