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
        // Session cookie automatically included with credentials: 'include'
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
          <h1 className="text-2xl font-bold mb-4">Dispute Resolution</h1>
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

  return (
    <main className="flex-1 container mx-auto px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Disputed Escrows</h1>
          <p className="text-muted-foreground">
            Review and resolve disputes to maintain platform trust
          </p>
        </div>

        {isLoading ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Loading disputes...</p>
          </Card>
        ) : (
          <>
            {disputes.length > 0 && (
              <div className="mb-6">
                <Card className="p-4">
                  <p className="text-sm">
                    <span className="font-semibold">{disputes.length}</span> disputed escrow
                    {disputes.length === 1 ? "" : "s"} requiring resolution
                  </p>
                </Card>
              </div>
            )}

            <DisputeList disputes={disputes} isLoading={isLoading} />
          </>
        )}
      </div>
    </main>
  );
}

