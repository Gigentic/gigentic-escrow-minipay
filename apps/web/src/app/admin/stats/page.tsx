"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { formatEther } from "viem";

interface PlatformStats {
  totalEscrows: string;
  volumeProcessed: string;
  feesCollected: string;
  escrowsByState: {
    created: number;
    disputed: number;
    completed: number;
    refunded: number;
  };
  successRate: string;
}

export default function AdminStatsPage() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      if (status !== "authenticated") {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/admin/stats", {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch statistics");
        }

        const data = await response.json();
        setStats(data);
      } catch (err: any) {
        console.error("Error fetching stats:", err);
        setError(err.message || "Failed to load statistics");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [status]);

  if (status === "loading") {
    return (
      <main className="flex-1 container mx-auto px-4 py-12">
        <Card className="p-8 text-center max-w-md mx-auto">
          <p className="text-muted-foreground">Loading...</p>
        </Card>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return (
      <main className="flex-1 container mx-auto px-4 py-12">
        <Card className="p-8 text-center max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-4">Platform Statistics</h1>
          <p className="text-muted-foreground">
            Please connect your wallet to access this page
          </p>
        </Card>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 container mx-auto px-4 py-12">
        <Card className="p-8 text-center max-w-md mx-auto border-red-300 dark:border-red-700">
          <h1 className="text-2xl font-bold mb-4 text-red-600 dark:text-red-400">
            Error
          </h1>
          <p className="text-muted-foreground">{error}</p>
        </Card>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-muted-foreground">Loading statistics...</p>
        </div>
      </main>
    );
  }

  if (!stats) {
    return (
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-muted-foreground">No statistics available</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 container mx-auto px-4 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Platform Statistics</h1>
          <p className="text-muted-foreground">
            Overview of platform performance and metrics
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Total Escrows</p>
            <p className="text-3xl font-bold">{stats.totalEscrows}</p>
          </Card>

          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Volume Processed</p>
            <p className="text-3xl font-bold">
              {formatEther(BigInt(stats.volumeProcessed))}
            </p>
            <p className="text-xs text-muted-foreground mt-1">cUSD</p>
          </Card>

          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Fees Collected</p>
            <p className="text-3xl font-bold">
              {formatEther(BigInt(stats.feesCollected))}
            </p>
            <p className="text-xs text-muted-foreground mt-1">cUSD</p>
          </Card>

          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Success Rate</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {stats.successRate}%
            </p>
          </Card>
        </div>

        {/* Escrows by State */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold mb-6">Escrows by State</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                <p className="text-sm font-medium">Created</p>
              </div>
              <p className="text-2xl font-bold">{stats.escrowsByState.created}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                <p className="text-sm font-medium">Disputed</p>
              </div>
              <p className="text-2xl font-bold">{stats.escrowsByState.disputed}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <p className="text-sm font-medium">Completed</p>
              </div>
              <p className="text-2xl font-bold">{stats.escrowsByState.completed}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 rounded-full bg-gray-500"></div>
                <p className="text-sm font-medium">Refunded</p>
              </div>
              <p className="text-2xl font-bold">{stats.escrowsByState.refunded}</p>
            </div>
          </div>
        </Card>

        {/* Additional Insights */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Platform Health</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Active Escrows</span>
                <span className="font-medium">{stats.escrowsByState.created}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Requiring Attention</span>
                <span className="font-medium text-yellow-600 dark:text-yellow-400">
                  {stats.escrowsByState.disputed}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Resolved</span>
                <span className="font-medium">
                  {stats.escrowsByState.completed + stats.escrowsByState.refunded}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Financial Overview</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Avg. Escrow Size</span>
                <span className="font-medium">
                  {stats.totalEscrows !== "0"
                    ? formatEther(
                        BigInt(stats.volumeProcessed) / BigInt(stats.totalEscrows)
                      )
                    : "0"}{" "}
                  cUSD
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Effective Fee Rate</span>
                <span className="font-medium">
                  {stats.volumeProcessed !== "0"
                    ? (
                        (Number(formatEther(BigInt(stats.feesCollected))) /
                          Number(formatEther(BigInt(stats.volumeProcessed)))) *
                        100
                      ).toFixed(2)
                    : "0"}
                  %
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Platform Fee</span>
                <span className="font-medium">1%</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}

