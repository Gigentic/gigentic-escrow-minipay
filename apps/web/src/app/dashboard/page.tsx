"use client";

import { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EscrowList } from "@/components/escrow/escrow-list";
import {
  MASTER_FACTORY_ADDRESS,
  MASTER_FACTORY_ABI,
  EscrowState,
} from "@/lib/escrow-config";
import { useUserEscrows } from "@/hooks/use-user-escrows";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { Loader2, SlidersHorizontal } from "lucide-react";

export default function DashboardPage() {
  // Protect this route - requires authentication
  const { shouldRenderContent, isCheckingAuth } = useRequireAuth();

  const { address, isConnected } = useAccount();

  const [filter, setFilter] = useState<"all" | "depositor" | "recipient">("all");
  const [stateFilter, setStateFilter] = useState<EscrowState | "all">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch user's escrow addresses from contract
  const { data: userEscrowAddresses } = useReadContract({
    address: MASTER_FACTORY_ADDRESS,
    abi: MASTER_FACTORY_ABI,
    functionName: "getUserEscrows",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      staleTime: 0, // Always consider stale to ensure fresh data
      refetchOnMount: "always", // Always refetch on mount
      refetchOnWindowFocus: true, // Refetch when window regains focus
      refetchInterval: false, // Don't poll, but refetch on mount/focus
    },
  });

  // Use hook to fetch details for each escrow in parallel
  const { escrows, isLoading } = useUserEscrows(userEscrowAddresses);

  // Show loading while checking auth (prevents flicker)
  if (isCheckingAuth) {
    return (
      <main className="flex-1 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </main>
    );
  }

  // Don't render content until auth verified (prevents flicker)
  if (!shouldRenderContent) {
    return null;
  }

  // Auth guard ensures we only reach here when authenticated
  if (!isConnected) {
    // This should never happen, but keep as fallback
    return null;
  }

  // Filter and sort escrows
  const filteredEscrows = escrows
    .filter((escrow) => {
      // Role filter
      if (filter === "depositor" && escrow.depositor.toLowerCase() !== address?.toLowerCase()) {
        return false;
      }
      if (filter === "recipient" && escrow.recipient.toLowerCase() !== address?.toLowerCase()) {
        return false;
      }

      // State filter
      if (stateFilter !== "all" && escrow.state !== stateFilter) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      // Sort by createdAt timestamp
      const aTime = Number(a.createdAt);
      const bTime = Number(b.createdAt);

      if (sortOrder === "newest") {
        return bTime - aTime; // Newest first (descending)
      } else {
        return aTime - bTime; // Oldest first (ascending)
      }
    });

  // Check if filters are active
  const hasActiveFilters = filter !== "all" || stateFilter !== "all";

  return (
    <main className="flex-1 container mx-auto px-4 py-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Payments</h1>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div>
              <Button
                variant={showFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="relative"
                >
                <SlidersHorizontal className="h-4 w-4" />
                {/* Indicator dot when filters are active but hidden */}
                {!showFilters && hasActiveFilters && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-primary rounded-full border border-background" />
                )}
              </Button>
            </div>
            <Link href="/create" className="flex-1 sm:flex-none">
              <Button size="lg" className="text-lg px-8 w-full">Create New Escrow</Button>
            </Link>
          </div>

        </div>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          {showFilters && (
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex gap-1">
                <Button
                  variant={sortOrder === "newest" ? "default" : "outline"}
                  onClick={() => setSortOrder("newest")}
                  size="sm"
                >
                  Newest First
                </Button>
                <Button
                  variant={sortOrder === "oldest" ? "default" : "outline"}
                  onClick={() => setSortOrder("oldest")}
                  size="sm"
                >
                  Oldest First
                </Button>
              </div>

              <div className="flex gap-1">
                <Button
                  variant={filter === "all" ? "default" : "outline"}
                  onClick={() => setFilter("all")}
                  size="sm"
                >
                  All Roles
                </Button>
                <Button
                  variant={filter === "depositor" ? "default" : "outline"}
                  onClick={() => setFilter("depositor")}
                  size="sm"
                >
                  As Depositor
                </Button>
                <Button
                  variant={filter === "recipient" ? "default" : "outline"}
                  onClick={() => setFilter("recipient")}
                  size="sm"
                >
                  As Recipient
                </Button>
              </div>

              <div className="flex gap-1">
                <Button
                  variant={stateFilter === "all" ? "default" : "outline"}
                  onClick={() => setStateFilter("all")}
                  size="sm"
                >
                  All
                </Button>
                <Button
                  variant={stateFilter === EscrowState.CREATED ? "default" : "outline"}
                  onClick={() => setStateFilter(EscrowState.CREATED)}
                  size="sm"
                >
                  Created
                </Button>
                <Button
                  variant={stateFilter === EscrowState.DISPUTED ? "default" : "outline"}
                  onClick={() => setStateFilter(EscrowState.DISPUTED)}
                  size="sm"
                >
                  Disputed
                </Button>
                <Button
                  variant={stateFilter === EscrowState.COMPLETED ? "default" : "outline"}
                  onClick={() => setStateFilter(EscrowState.COMPLETED)}
                  size="sm"
                >
                  Completed
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Escrow List */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading escrows...</p>
          </div>
        ) : (
          <EscrowList
            escrows={filteredEscrows}
            currentUserAddress={address}
            emptyMessage={
              filter === "all"
                ? "No escrows found. Create your first escrow to get started!"
                : `No escrows found where you are the ${filter}`
            }
          />
        )}
      </div>
    </main>
  );
}

