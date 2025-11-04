import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/server-auth";
import { redirect } from "next/navigation";

// Force dynamic rendering - this page uses session/auth
export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  // Server-side admin check - redirects if not admin
  try {
    await requireAdmin();
  } catch (error) {
    // Redirect unauthorized users to home page
    redirect("/");
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

