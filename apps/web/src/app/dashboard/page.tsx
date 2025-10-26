"use client";

import { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EscrowList } from "@/components/escrow/escrow-list";
import {
  MASTER_FACTORY_ADDRESS,
  MASTER_FACTORY_ABI,
  EscrowState,
} from "@/lib/escrow-config";
import { useUserEscrows } from "@/hooks/use-user-escrows";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();

  const [filter, setFilter] = useState<"all" | "depositor" | "recipient">("all");
  const [stateFilter, setStateFilter] = useState<EscrowState | "all">("all");

  // Fetch user's escrow addresses from contract
  const { data: userEscrowAddresses } = useReadContract({
    address: MASTER_FACTORY_ADDRESS,
    abi: MASTER_FACTORY_ABI,
    functionName: "getUserEscrows",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      staleTime: 30_000, // Fresh for 30 seconds
      refetchOnMount: true, // Always refetch on mount if stale
    },
  });

  // Use hook to fetch details for each escrow in parallel
  const { escrows, isLoading } = useUserEscrows(userEscrowAddresses);

  if (!isConnected) {
    return (
      <main className="flex-1 container mx-auto px-4 py-12">
        <Card className="p-8 text-center max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
          <p className="text-muted-foreground mb-6">
            Please connect your wallet to view your escrows
          </p>
        </Card>
      </main>
    );
  }

  // Filter escrows
  const filteredEscrows = escrows.filter((escrow) => {
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
  });

  // Calculate statistics
  const stats = {
    total: escrows.length,
    asDepositor: escrows.filter((e) => e.depositor.toLowerCase() === address?.toLowerCase()).length,
    asRecipient: escrows.filter((e) => e.recipient.toLowerCase() === address?.toLowerCase()).length,
    created: escrows.filter((e) => e.state === EscrowState.CREATED).length,
    disputed: escrows.filter((e) => e.state === EscrowState.DISPUTED).length,
    completed: escrows.filter((e) => e.state === EscrowState.COMPLETED).length,
    refunded: escrows.filter((e) => e.state === EscrowState.REFUNDED).length,
  };

  return (
    <main className="flex-1 container mx-auto px-4 py-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Manage your escrows</p>
          </div>
          <Link href="/create">
            <Button size="lg">Create New Escrow</Button>
          </Link>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Escrows</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">As Depositor</p>
            <p className="text-2xl font-bold">{stats.asDepositor}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">As Recipient</p>
            <p className="text-2xl font-bold">{stats.asRecipient}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Completed</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.completed}
            </p>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex gap-2">
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

          <div className="flex gap-2 flex-wrap">
            <Button
              variant={stateFilter === "all" ? "default" : "outline"}
              onClick={() => setStateFilter("all")}
              size="sm"
            >
              All States
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

