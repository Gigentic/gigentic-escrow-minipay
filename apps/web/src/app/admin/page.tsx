"use client";

import { useAccount } from "wagmi";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminDashboardPage() {
  const { address, isConnected } = useAccount();

  // Check if user is admin (in real implementation, check against ADMIN_WALLET_ADDRESS)
  const isAdmin = isConnected && process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS?.toLowerCase() === address?.toLowerCase();

  if (!isConnected) {
    return (
      <main className="flex-1 container mx-auto px-4 py-12">
        <Card className="p-8 text-center max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Please connect your admin wallet to access this page
          </p>
        </Card>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="flex-1 container mx-auto px-4 py-12">
        <Card className="p-8 text-center max-w-md mx-auto border-red-300 dark:border-red-700">
          <h1 className="text-2xl font-bold mb-4 text-red-600 dark:text-red-400">
            Access Denied
          </h1>
          <p className="text-muted-foreground">
            You do not have admin access to this page
          </p>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex-1 container mx-auto px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

        {/* Quick Links */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Link href="/admin/disputes">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Dispute Resolution</h2>
                  <p className="text-muted-foreground">
                    Review and resolve disputed escrows
                  </p>
                </div>
                <div className="text-4xl">⚖️</div>
              </div>
            </Card>
          </Link>

          <Link href="/admin/stats">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Platform Statistics</h2>
                  <p className="text-muted-foreground">
                    View platform-wide metrics and analytics
                  </p>
                </div>
                <div className="text-4xl">📊</div>
              </div>
            </Card>
          </Link>
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Admin Capabilities
            </h3>
            <ul className="space-y-2 text-sm">
              <li>• Resolve disputes</li>
              <li>• View all escrows</li>
              <li>• Access platform stats</li>
              <li>• Update arbiter address</li>
            </ul>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Resolution Guidelines
            </h3>
            <ul className="space-y-2 text-sm">
              <li>• Review deliverables carefully</li>
              <li>• Consider all evidence</li>
              <li>• Provide clear rationale</li>
              <li>• Act with impartiality</li>
            </ul>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Important Notes
            </h3>
            <ul className="space-y-2 text-sm">
              <li>• Resolutions are final</li>
              <li>• Recorded on-chain</li>
              <li>• Affects platform reputation</li>
              <li>• Use multi-sig for production</li>
            </ul>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <Link href="/admin/disputes">
              <Button size="lg">View Pending Disputes</Button>
            </Link>
            <Link href="/admin/stats">
              <Button variant="outline" size="lg">
                View Statistics
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" size="lg">
                User Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

