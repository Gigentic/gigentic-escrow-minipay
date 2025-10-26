# Cache Invalidation Migration Guide

## Overview

This guide shows **exactly** which files to change to remove hacks and implement proper TanStack Query cache invalidation.

**Goal:** Replace URL/state hacks with `queryClient.invalidateQueries()` calls.

---

## Migration Checklist

- [ ] **File 1:** `components/escrow/create-escrow-form.tsx`
- [ ] **File 2:** `components/admin/resolve-form.tsx`
- [ ] **File 3:** `app/admin/disputes/page.tsx`
- [ ] **File 4:** `app/dashboard/page.tsx`
- [ ] **File 5:** `app/escrow/[address]/page.tsx`
- [ ] **File 6:** `components/escrow/escrow-actions.tsx`
- [ ] **Testing:** Verify all flows work

---

## File 1: Create Escrow Form

**File:** `apps/web/src/components/escrow/create-escrow-form.tsx`

### Changes

#### 1. Add Import

```typescript
// At the top with other imports
import { useQueryClient } from '@tanstack/react-query'; // [!code ++]
```

#### 2. Get QueryClient Instance

```typescript
export function CreateEscrowForm() {
  const router = useRouter();
  const { address: userAddress, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient(); // [!code ++]
```

#### 3. Replace Redirect with Cache Invalidation

**FIND THIS CODE (around line 206-207):**

```typescript
// Redirect to dashboard
router.push("/dashboard");
```

**REPLACE WITH:**

```typescript
// Invalidate escrows cache so dashboard shows new escrow
await queryClient.invalidateQueries({
  queryKey: ['readContract', publicClient?.chain?.id, MASTER_FACTORY_ADDRESS, 'getUserEscrows'],
});

// Redirect to dashboard
router.push("/dashboard");
```

### Complete Section After Changes

```typescript
// Step 3: Store deliverable document using escrow address as key
const storeResponse = await fetch("/api/documents/store", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    hash: deliverableHash,
    document: deliverable,
    escrowAddress: escrowAddress,
  }),
});

if (storeResponse.ok) {
  console.log("Deliverable document stored with escrow address:", escrowAddress);
} else {
  console.error("Failed to store deliverable document");
}

// Invalidate escrows cache so dashboard shows new escrow
await queryClient.invalidateQueries({
  queryKey: ['readContract', publicClient?.chain?.id, MASTER_FACTORY_ADDRESS, 'getUserEscrows'],
});

// Redirect to dashboard
router.push("/dashboard");
```

---

## File 2: Resolve Form (Admin)

**File:** `apps/web/src/components/admin/resolve-form.tsx`

### Changes

#### 1. Add Import

```typescript
// At the top with other imports
import { useQueryClient } from '@tanstack/react-query'; // [!code ++]
```

#### 2. Get QueryClient Instance

```typescript
export function ResolveForm({
  escrowAddress,
  disputeReason,
  deliverableTitle,
  deliverableDescription,
  acceptanceCriteria = [],
}: ResolveFormProps) {
  const router = useRouter();
  const { address: adminAddress } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient(); // [!code ++]
```

#### 3. Replace Redirect with Cache Invalidation

**FIND THIS CODE (around line 110-111):**

```typescript
// Redirect back to disputes list with refresh parameter
router.push(`/admin/disputes?refresh=${Date.now()}`);
```

**REPLACE WITH:**

```typescript
// Invalidate disputes cache so list updates
await queryClient.invalidateQueries({
  queryKey: ['disputes'],
});

// Invalidate this specific escrow's details
await queryClient.invalidateQueries({
  queryKey: ['readContract', undefined, escrowAddress],
});

// Redirect back to disputes list
router.push("/admin/disputes");
```

### Complete Section After Changes

```typescript
// Step 2: Call resolve on-chain
const tx = await writeContractAsync({
  address: escrowAddress,
  abi: ESCROW_CONTRACT_ABI,
  functionName: "resolve",
  args: [favorDepositor, resolutionHash],
});

console.log("Resolution tx:", tx);

// Invalidate disputes cache so list updates
await queryClient.invalidateQueries({
  queryKey: ['disputes'],
});

// Invalidate this specific escrow's details
await queryClient.invalidateQueries({
  queryKey: ['readContract', undefined, escrowAddress],
});

// Redirect back to disputes list
router.push("/admin/disputes");
```

---

## File 3: Admin Disputes Page

**File:** `apps/web/src/app/admin/disputes/page.tsx`

### Changes

#### 1. Remove Imports (if they exist)

```typescript
import { useSearchParams } from "next/navigation"; // [!code --]
```

#### 2. Remove URL Parameter Hack

**FIND THIS CODE:**

```typescript
const searchParams = useSearchParams(); // [!code --]
const refreshParam = searchParams.get("refresh"); // [!code --]
```

**DELETE IT ENTIRELY**

#### 3. Remove State Hack

**FIND THIS CODE:**

```typescript
const [mountTrigger, setMountTrigger] = useState(0); // [!code --]

// Force refetch on mount // [!code --]
useEffect(() => { // [!code --]
  setMountTrigger(Date.now()); // [!code --]
}, []); // [!code --]
```

**DELETE IT ENTIRELY**

#### 4. Clean Up useEffect Dependency

**FIND THIS CODE:**

```typescript
useEffect(() => {
  const fetchDisputes = async () => {
    // ... fetch logic
  };

  fetchDisputes();
}, [status, refreshParam]); // [!code --]
}, [status, mountTrigger]); // [!code --]
```

**REPLACE WITH:**

```typescript
useEffect(() => {
  const fetchDisputes = async () => {
    // ... fetch logic
  };

  fetchDisputes();
}, [status]); // [!code ++]
```

### Complete File After Changes

```typescript
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { DisputeList } from "@/components/admin/dispute-list";
import { type Address } from "viem";

interface DisputedEscrow {
  address: Address;
  depositor: Address;
  recipient: Address;
  escrowAmount: string;
  platformFee: string;
  disputeBond: string;
  deliverableHash: string;
  createdAt: string;
  disputeReason: string;
}

export default function AdminDisputesPage() {
  const { data: session, status } = useSession();
  const [disputes, setDisputes] = useState<DisputedEscrow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDisputes = async () => {
      if (status !== "authenticated") {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/admin/disputes", {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch disputes");
        }

        const data = await response.json();
        setDisputes(data.disputes);
      } catch (err: any) {
        console.error("Error fetching disputes:", err);
        setError(err.message || "Failed to load disputes");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDisputes();
  }, [status]);

  // ... rest of component
}
```

---

## File 4: Dashboard Page

**File:** `apps/web/src/app/dashboard/page.tsx`

### Changes

#### 1. Remove Force Refetch Hook

**FIND THIS CODE:**

```typescript
// Force refetch on mount to get latest data // [!code --]
useEffect(() => { // [!code --]
  if (address) { // [!code --]
    refetch(); // [!code --]
  } // [!code --]
}, [address, refetch]); // [!code --]
```

**DELETE IT ENTIRELY**

#### 2. Configure Query Properly

**FIND THIS CODE:**

```typescript
const { data: userEscrowAddresses, refetch } = useReadContract({
  address: MASTER_FACTORY_ADDRESS,
  abi: MASTER_FACTORY_ABI,
  functionName: "getUserEscrows",
  args: address ? [address] : undefined,
  query: {
    enabled: !!address,
  },
});
```

**REPLACE WITH:**

```typescript
const { data: userEscrowAddresses } = useReadContract({
  address: MASTER_FACTORY_ADDRESS,
  abi: MASTER_FACTORY_ABI,
  functionName: "getUserEscrows",
  args: address ? [address] : undefined,
  query: {
    enabled: !!address,
    staleTime: 30_000, // Fresh for 30 seconds
    refetchOnMount: true, // Always refetch on mount
  },
});
```

### Complete Section After Changes

```typescript
// Fetch user's escrows from contract
const { data: userEscrowAddresses } = useReadContract({
  address: MASTER_FACTORY_ADDRESS,
  abi: MASTER_FACTORY_ABI,
  functionName: "getUserEscrows",
  args: address ? [address] : undefined,
  query: {
    enabled: !!address,
    staleTime: 30_000, // Fresh for 30 seconds
    refetchOnMount: true, // Always refetch on mount
  },
});

// Fetch details for each escrow
useEffect(() => {
  const fetchEscrowDetails = async () => {
    // ... existing fetch logic
  };

  fetchEscrowDetails();
}, [userEscrowAddresses, publicClient]);
```

---

## File 5: Escrow Detail Page

**File:** `apps/web/src/app/escrow/[address]/page.tsx`

### Changes

#### 1. Remove State Hack

**FIND THIS CODE:**

```typescript
const [mountTrigger, setMountTrigger] = useState(0); // [!code --]

// Force refetch on mount // [!code --]
useEffect(() => { // [!code --]
  setMountTrigger(Date.now()); // [!code --]
}, []); // [!code --]
```

**DELETE IT ENTIRELY**

#### 2. Remove mountTrigger from Dependency Array

**FIND THIS CODE:**

```typescript
useEffect(() => {
  fetchEscrowData();
}, [escrowAddress, publicClient, mountTrigger]); // [!code --]
```

**REPLACE WITH:**

```typescript
useEffect(() => {
  fetchEscrowData();
}, [escrowAddress, publicClient]); // [!code ++]
```

### Complete Section After Changes

```typescript
export default function EscrowDetailPage() {
  const params = useParams();
  const publicClient = usePublicClient();
  const escrowAddress = params.address as Address;

  const [details, setDetails] = useState<EscrowDetails | null>(null);
  const [deliverable, setDeliverable] = useState<DeliverableDocument | null>(null);
  const [disputeInfo, setDisputeInfo] = useState<{ disputeReason: string; resolutionHash?: string } | null>(null);
  const [resolution, setResolution] = useState<ResolutionDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchEscrowData = async () => {
    // ... existing fetch logic
  };

  useEffect(() => {
    fetchEscrowData();
  }, [escrowAddress, publicClient]);

  // ... rest of component
}
```

---

## File 6: Escrow Actions

**File:** `apps/web/src/components/escrow/escrow-actions.tsx`

### Changes

#### 1. Add Import

```typescript
import { useQueryClient } from '@tanstack/react-query'; // [!code ++]
```

#### 2. Get QueryClient Instance

```typescript
export function EscrowActions({
  escrowAddress,
  depositor,
  recipient,
  state,
  onSuccess,
}: EscrowActionsProps) {
  const { address: userAddress } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient(); // [!code ++]
```

#### 3. Add Cache Invalidation to Complete Action

**FIND the `handleComplete` function and ADD cache invalidation:**

```typescript
const handleComplete = async () => {
  // ... existing validation and contract call

  await writeContractAsync({
    address: escrowAddress,
    abi: ESCROW_CONTRACT_ABI,
    functionName: "complete",
  });

  // Invalidate this escrow's cache
  await queryClient.invalidateQueries({
    queryKey: ['readContract', publicClient?.chain?.id, escrowAddress],
  });

  // Invalidate user's escrow list
  await queryClient.invalidateQueries({
    queryKey: ['readContract', publicClient?.chain?.id, MASTER_FACTORY_ADDRESS, 'getUserEscrows'],
  });

  onSuccess?.();
};
```

#### 4. Add Cache Invalidation to Dispute Action

**FIND the `handleDispute` function and ADD cache invalidation:**

```typescript
const handleDispute = async () => {
  // ... existing dispute logic

  await writeContractAsync({
    address: escrowAddress,
    abi: ESCROW_CONTRACT_ABI,
    functionName: "dispute",
    args: [disputeHash],
  });

  // Invalidate this escrow's cache
  await queryClient.invalidateQueries({
    queryKey: ['readContract', publicClient?.chain?.id, escrowAddress],
  });

  // Invalidate user's escrow list (state changed)
  await queryClient.invalidateQueries({
    queryKey: ['readContract', publicClient?.chain?.id, MASTER_FACTORY_ADDRESS, 'getUserEscrows'],
  });

  onSuccess?.();
  setIsDisputeModalOpen(false);
};
```

---

## Query Key Reference

For your reference, here are the query keys used in your app:

### Smart Contract Queries

```typescript
// User's escrow list
['readContract', chainId, MASTER_FACTORY_ADDRESS, 'getUserEscrows', userAddress]

// Specific escrow details
['readContract', chainId, escrowAddress, 'getDetails']

// Any query for a specific escrow
['readContract', chainId, escrowAddress]

// All readContract queries (broad invalidation)
['readContract']
```

### API Queries

```typescript
// Disputes list (from /api/admin/disputes)
['disputes']

// Document queries (from /api/documents/[hash])
['documents', hash]
```

### Invalidation Patterns

```typescript
// Invalidate everything for an escrow (when state changes)
queryClient.invalidateQueries({
  queryKey: ['readContract', chainId, escrowAddress],
});

// Invalidate user's escrow list (when new escrow created)
queryClient.invalidateQueries({
  queryKey: ['readContract', chainId, MASTER_FACTORY_ADDRESS, 'getUserEscrows'],
});

// Invalidate disputes list (when dispute resolved)
queryClient.invalidateQueries({
  queryKey: ['disputes'],
});

// Invalidate all readContract queries (nuclear option)
queryClient.invalidateQueries({
  queryKey: ['readContract'],
});
```

---

## Testing Checklist

After making all changes, test these flows:

### ✅ Test 1: Create Escrow
1. Go to `/create`
2. Fill out form and create escrow
3. Wait for transaction confirmation
4. **Expected:** Redirects to dashboard
5. **Expected:** New escrow appears immediately (no manual refresh)

### ✅ Test 2: Complete Escrow
1. Go to escrow detail page
2. Click "Mark as Complete"
3. Wait for transaction confirmation
4. **Expected:** Page updates to show "Completed" state
5. Go to dashboard
6. **Expected:** Escrow shows as "Completed"

### ✅ Test 3: Dispute Escrow
1. Go to escrow detail page
2. Click "Raise Dispute"
3. Submit dispute reason
4. **Expected:** Page updates to show "Disputed" state
5. Go to dashboard
6. **Expected:** Escrow shows as "Disputed"

### ✅ Test 4: Resolve Dispute (Admin)
1. Login as admin (Alice)
2. Go to `/admin/disputes`
3. Click on a disputed escrow
4. Submit resolution
5. **Expected:** Redirects to disputes list
6. **Expected:** Resolved escrow no longer in list

### ✅ Test 5: Navigate Back and Forth
1. Create an escrow
2. Go to dashboard (should appear)
3. Navigate to another page
4. Come back to dashboard
5. **Expected:** Escrow still shows (cached)
6. Wait 30+ seconds
7. Navigate back to dashboard
8. **Expected:** Data refetches (staleTime expired)

---

## Common Issues & Solutions

### Issue 1: "queryClient is not defined"

**Problem:** Forgot to import or get instance

**Solution:**
```typescript
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();
```

### Issue 2: Cache not invalidating

**Problem:** Wrong query key

**Solution:** Use React Query DevTools to see exact query keys:

```typescript
// Install DevTools
pnpm add @tanstack/react-query-devtools

// Add to layout
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<ReactQueryDevtools initialIsOpen={false} />
```

### Issue 3: "Cannot read property 'invalidateQueries' of undefined"

**Problem:** Component not inside QueryClientProvider

**Solution:** Make sure your component is wrapped in `WalletProvider` which includes `QueryClientProvider`

### Issue 4: Data still stale after invalidation

**Problem:** Query is disabled or not mounted

**Solution:** Check `enabled` flag and ensure component is rendering the query

---

## Rollback Plan

If something breaks, you can temporarily revert:

1. **Undo specific file:**
   ```bash
   git checkout HEAD -- apps/web/src/components/escrow/create-escrow-form.tsx
   ```

2. **Undo all changes:**
   ```bash
   git reset --hard HEAD
   ```

3. **Keep changes but revert to hacks:**
   - Comment out `invalidateQueries` calls
   - Add back URL parameters temporarily

---

## Summary of Changes

### Files Modified: 6

1. ✅ `components/escrow/create-escrow-form.tsx` - Add invalidation after create
2. ✅ `components/admin/resolve-form.tsx` - Add invalidation after resolve
3. ✅ `app/admin/disputes/page.tsx` - Remove URL/state hacks
4. ✅ `app/dashboard/page.tsx` - Remove force refetch, configure query
5. ✅ `app/escrow/[address]/page.tsx` - Remove state hack
6. ✅ `components/escrow/escrow-actions.tsx` - Add invalidation to actions

### Lines Removed: ~20
- All `mountTrigger` state and effects
- All URL `?refresh=` parameters
- All `useSearchParams` for refresh
- All force `refetch()` effects

### Lines Added: ~30
- 6 `useQueryClient()` instances
- ~12 `invalidateQueries()` calls
- Better query configurations

### Net Result
- ✅ Cleaner code
- ✅ Better performance
- ✅ Proper React Query usage
- ✅ Maintainable patterns
- ✅ Automatic cache management

---

## Next Steps

1. **Make changes file by file** using this guide
2. **Test after each file** to catch issues early
3. **Install React Query DevTools** to debug
4. **Review STATE_MANAGEMENT_ISSUES.md** for additional optimizations
5. **Consider implementing Phase 2 improvements** (centralized queries, prefetching)

Good luck! 🚀
