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
      </div>
    </main>
  );
}

