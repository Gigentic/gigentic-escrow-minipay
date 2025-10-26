# TanStack Query + Wagmi + Viem - Simple Sandbox Guide

## Overview

This guide explains how **TanStack Query** (React Query), **Wagmi**, and **Viem** work together using a super simple example: **Reading the balance of a cUSD token**.

### The Stack

```
┌─────────────────────────────────────┐
│  Your React Component               │
│  (UI Layer)                         │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Wagmi Hooks                        │
│  (useReadContract, useAccount, etc) │
│  - Wraps Viem actions               │
│  - Manages React state              │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  TanStack Query                     │
│  (Built into Wagmi)                 │
│  - Caching                          │
│  - Deduplication                    │
│  - Background refetching            │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Viem Actions                       │
│  (Low-level Ethereum interactions)  │
│  - Type-safe                        │
│  - Fast                             │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Celo Blockchain                    │
│  (Smart Contracts)                  │
└─────────────────────────────────────┘
```

---

## Super Simple Use Case: Token Balance Reader

**Goal:** Display a user's cUSD balance that:
- ✅ Fetches from blockchain
- ✅ Caches the result
- ✅ Doesn't refetch unnecessarily
- ✅ Updates when needed

---

## Step-by-Step Implementation

### Step 1: Understanding the Setup (Already Done in Your App)

Your app already has this setup in `apps/web/src/components/wallet-provider.tsx`:

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'

// 1. Create TanStack Query client
const queryClient = new QueryClient()

// 2. Wrap your app
export function WalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

**What's happening:**
- `QueryClient` = The "brain" that manages all cached data
- `WagmiProvider` = Provides blockchain config (RPC, chains, etc.)
- `QueryClientProvider` = Makes cache available to all components

---

### Step 2: Create the Simple Sandbox Component

Create `/apps/web/src/components/sandbox/token-balance-sandbox.tsx`:

```typescript
"use client";

import { useReadContract, useAccount } from "wagmi";
import { type Address } from "viem";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ERC20 ABI (just the balanceOf function)
const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

// cUSD address on Celo Sepolia
const CUSD_ADDRESS = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";

export function TokenBalanceSandbox() {
  const { address: userAddress } = useAccount();

  // 🎯 THIS IS THE KEY HOOK - useReadContract
  const {
    data: balance,
    isLoading,
    isError,
    error,
    refetch,
    dataUpdatedAt,
  } = useReadContract({
    // Contract details
    address: CUSD_ADDRESS as Address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,

    // 🔥 TanStack Query configuration
    query: {
      enabled: !!userAddress, // Only run if user connected
      staleTime: 30_000, // Data fresh for 30 seconds
      cacheTime: 5 * 60_000, // Keep in cache for 5 minutes
      refetchOnWindowFocus: false, // Don't refetch when switching tabs
      refetchOnMount: false, // Don't refetch on component mount
    },
  });

  if (!userAddress) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Token Balance Sandbox</h2>
        <p className="text-muted-foreground">Connect your wallet to see your cUSD balance</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4">Token Balance Sandbox</h2>

      <div className="space-y-4">
        {/* User Address */}
        <div>
          <p className="text-sm text-muted-foreground">Your Address:</p>
          <p className="font-mono text-sm">{userAddress}</p>
        </div>

        {/* Balance */}
        <div>
          <p className="text-sm text-muted-foreground">cUSD Balance:</p>
          {isLoading && <p className="text-lg">Loading...</p>}
          {isError && (
            <p className="text-lg text-red-500">
              Error: {error?.message}
            </p>
          )}
          {balance !== undefined && (
            <p className="text-lg font-bold">
              {(Number(balance) / 1e18).toFixed(4)} cUSD
            </p>
          )}
        </div>

        {/* Cache Info */}
        <div className="bg-muted p-4 rounded-md">
          <p className="text-sm font-semibold mb-2">Cache Info:</p>
          <div className="space-y-1 text-xs">
            <p>Last updated: {new Date(dataUpdatedAt).toLocaleTimeString()}</p>
            <p>Status: {isLoading ? "Loading" : "Cached"}</p>
          </div>
        </div>

        {/* Manual Refetch Button */}
        <Button onClick={() => refetch()} className="w-full">
          Refresh Balance
        </Button>
      </div>
    </Card>
  );
}
```

---

### Step 3: Add Sandbox to a Page

Create `/apps/web/src/app/sandbox/page.tsx`:

```typescript
import { TokenBalanceSandbox } from "@/components/sandbox/token-balance-sandbox";

export default function SandboxPage() {
  return (
    <main className="flex-1 container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">TanStack Query Sandbox</h1>
        <TokenBalanceSandbox />
      </div>
    </main>
  );
}
```

---

## How It Works: The Magic Explained

### 1. The `useReadContract` Hook

```typescript
const { data, isLoading, refetch } = useReadContract({
  address: CUSD_ADDRESS,
  abi: ERC20_ABI,
  functionName: "balanceOf",
  args: [userAddress],
  query: { /* TanStack Query config */ }
});
```

**What Wagmi Does Behind the Scenes:**
1. Creates a unique cache key: `['readContract', chainId, CUSD_ADDRESS, 'balanceOf', userAddress]`
2. Checks TanStack Query cache for existing data
3. If cache miss or stale, calls Viem to fetch from blockchain
4. Stores result in cache
5. Returns data to your component

### 2. The `query` Configuration Object

```typescript
query: {
  enabled: !!userAddress,           // ← Don't fetch if no user
  staleTime: 30_000,               // ← Fresh for 30s
  cacheTime: 5 * 60_000,           // ← Keep in memory for 5min
  refetchOnWindowFocus: false,     // ← Don't refetch on tab switch
  refetchOnMount: false,           // ← Use cache on mount
}
```

**Explanation:**

| Parameter | What It Does | Example Value |
|-----------|--------------|---------------|
| `enabled` | Conditionally run query | `!!userAddress` (only if user connected) |
| `staleTime` | How long data is "fresh" | `30_000` (30 seconds) |
| `cacheTime` | How long to keep in memory | `5 * 60_000` (5 minutes) |
| `refetchOnWindowFocus` | Refetch when tab regains focus | `false` (don't refetch) |
| `refetchOnMount` | Refetch when component mounts | `false` (use cache) |

### 3. Cache Behavior Timeline

```
Time 0s:    Component mounts
            ↓
            Cache miss
            ↓
            Fetch from blockchain (500ms)
            ↓
            Cache result
            ↓
            Display: "100.0 cUSD"

Time 10s:   User navigates away
            ↓
            Data stays in cache

Time 20s:   User comes back
            ↓
            Data still fresh (< 30s)
            ↓
            Show instantly from cache

Time 40s:   User comes back again
            ↓
            Data now stale (> 30s)
            ↓
            Fetch from blockchain again

Time 5min:  Cache expires
            ↓
            Data removed from memory
```

---

## Experiment: Testing Cache Behavior

### Experiment 1: See Instant Loading

1. Go to `/sandbox`
2. Connect wallet
3. Watch balance load (takes ~500ms)
4. Navigate to `/dashboard` and back
5. **Result**: Balance appears instantly (from cache!)

### Experiment 2: Test staleTime

```typescript
query: {
  staleTime: 5_000, // Change to 5 seconds
}
```

1. Load balance
2. Wait 3 seconds → navigate away and back → instant load
3. Wait 10 seconds → navigate away and back → refetches from blockchain

### Experiment 3: Force Refetch

```typescript
<Button onClick={() => refetch()}>
  Refresh Balance
</Button>
```

Click button → forces fresh blockchain fetch regardless of staleTime

---

## Understanding the Return Values

```typescript
const {
  data,              // The balance (bigint or undefined)
  isLoading,         // First fetch in progress?
  isError,           // Did fetch fail?
  error,             // Error object if failed
  refetch,           // Function to manually refetch
  dataUpdatedAt,     // Timestamp of last update
  isFetching,        // Any fetch in progress (including bg refetch)
  isSuccess,         // Fetch succeeded?
} = useReadContract({...});
```

**Key Differences:**
- `isLoading` = first time loading (no cached data)
- `isFetching` = any fetch (including background refetch)

---

## Common Patterns

### Pattern 1: Refetch on Block Change

```typescript
import { useBlockNumber } from "wagmi";
import { useEffect } from "react";

const { data: blockNumber } = useBlockNumber({ watch: true });
const { data: balance, refetch } = useReadContract({...});

// Refetch balance every block
useEffect(() => {
  refetch();
}, [blockNumber, refetch]);
```

### Pattern 2: Refetch on Action

```typescript
const { data: balance, refetch } = useReadContract({...});
const { writeContract } = useWriteContract();

const handleTransfer = async () => {
  await writeContract({...});
  // Balance changed, refetch it
  await refetch();
};
```

### Pattern 3: Cache Invalidation

```typescript
import { useQueryClient } from "@tanstack/react-query";

const queryClient = useQueryClient();

// Invalidate all balance queries
queryClient.invalidateQueries({ queryKey: ["readContract"] });

// Invalidate specific query
queryClient.invalidateQueries({
  queryKey: ["readContract", chainId, CUSD_ADDRESS, "balanceOf"],
});
```

---

## Key Takeaways

### ✅ What You Learned

1. **Wagmi hooks = Viem + TanStack Query + React**
2. **`query` parameter** controls caching behavior
3. **`staleTime`** = how long data is "fresh"
4. **`cacheTime`** = how long to keep in memory
5. **`refetch()`** = force fresh fetch
6. **Cache prevents duplicate requests** (performance!)

### 🎯 When to Use What

| Scenario | Configuration |
|----------|---------------|
| **Real-time data** (e.g., auctions) | `staleTime: 0, refetchInterval: 5000` |
| **Semi-static data** (e.g., balance) | `staleTime: 30_000, cacheTime: 5 * 60_000` |
| **Static data** (e.g., token name) | `staleTime: Infinity, cacheTime: Infinity` |
| **One-time fetch** | `enabled: false` + manual `refetch()` |

### 🚀 Next Steps

1. **Play with the sandbox** - change staleTime values
2. **Check the network tab** - see when requests are made
3. **Open React DevTools** - view TanStack Query cache
4. **Try multiple components** - see cache sharing

---

## Debugging Tips

### 1. Install React Query DevTools

```bash
pnpm add @tanstack/react-query-devtools -w
```

```typescript
// app/layout.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export default function RootLayout({ children }) {
  return (
    <>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  );
}
```

### 2. Log Query Key

```typescript
const result = useReadContract({...});

console.log('Query Key:', result.queryKey);
// Output: ['readContract', 42220, '0x...', 'balanceOf', '0x...']
```

### 3. Monitor Fetching

```typescript
const { isFetching, dataUpdatedAt } = useReadContract({...});

useEffect(() => {
  console.log('Fetching:', isFetching, 'Updated:', new Date(dataUpdatedAt));
}, [isFetching, dataUpdatedAt]);
```

---

## Comparison: With vs Without Caching

### ❌ Without Caching (Old Way)

```typescript
const [balance, setBalance] = useState<bigint>();

useEffect(() => {
  // Fetch EVERY TIME component mounts
  publicClient.readContract({...}).then(setBalance);
}, []);

// Navigate away and back = fetch again
// Multiple components = multiple fetches
// No deduplication
```

### ✅ With Caching (Wagmi + TanStack Query)

```typescript
const { data: balance } = useReadContract({
  query: { staleTime: 30_000 }
});

// First component mounts = fetch
// Second component mounts = use cache
// Navigate away and back (within 30s) = use cache
// Automatic deduplication
// Automatic background refetching
```

---

## Real-World Example: Dashboard with Multiple Hooks

```typescript
export function Dashboard() {
  const { address } = useAccount();

  // All these hooks share the same TanStack Query cache
  const { data: cUSDBalance } = useReadContract({
    address: CUSD_ADDRESS,
    functionName: "balanceOf",
    args: [address],
    query: { staleTime: 30_000 },
  });

  const { data: celoBalance } = useBalance({
    address,
    query: { staleTime: 30_000 },
  });

  const { data: escrowCount } = useReadContract({
    address: MASTER_FACTORY_ADDRESS,
    functionName: "getUserEscrowCount",
    args: [address],
    query: { staleTime: 60_000 }, // Less frequently changing
  });

  // All queries are:
  // 1. Cached independently
  // 2. Deduplicated (no duplicate requests)
  // 3. Background refetched when stale
}
```

---

## Summary

🎓 **You've learned:**
- How Wagmi wraps Viem with React + TanStack Query
- How `useReadContract` caches blockchain data
- What `staleTime`, `cacheTime`, and `refetch` do
- How to control caching behavior
- When data is fetched vs served from cache

🏗️ **Build your own:**
- Try the sandbox component
- Experiment with different `staleTime` values
- Add multiple components using the same query
- Watch the network tab to see caching in action

📚 **Further Reading:**
- [TanStack Query Docs](https://tanstack.com/query/latest/docs/react/overview)
- [Wagmi useReadContract](https://wagmi.sh/react/api/hooks/useReadContract)
- [Viem readContract](https://viem.sh/docs/contract/readContract)
