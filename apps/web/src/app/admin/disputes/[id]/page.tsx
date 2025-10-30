"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { type Address } from "viem";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResolveForm } from "@/components/admin/resolve-form";
import { AddressDisplay } from "@/components/wallet/address-display";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { formatEther } from "viem";
import { ShieldAlert } from "lucide-react";

interface DisputeDetails {
  address: Address;
  depositor: Address;
  recipient: Address;
  escrowAmount: string;
  platformFee: string;
  disputeBond: string;
  deliverableHash: string;
  createdAt: string;
  disputeReason: string;
  deliverable?: {
    title: string;
    description: string;
    acceptanceCriteria: string[];
    category?: string;
  };
}

export default function ResolveDisputePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { isAdmin, isLoading: isCheckingAdmin } = useIsAdmin();
  const escrowAddress = params.id as Address;

  const [dispute, setDispute] = useState<DisputeDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDispute = async () => {
      if (status !== "authenticated") {
        setIsLoading(false);
        return;
      }

      try {
        // Session cookie automatically included with credentials: 'include'
        const response = await fetch(`/api/admin/disputes/${escrowAddress}`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch dispute details");
        }

        const data = await response.json();
        setDispute(data);
      } catch (err: any) {
        console.error("Error fetching dispute:", err);
        setError(err.message || "Failed to load dispute details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDispute();
  }, [status, escrowAddress]);

  // Show loading while checking auth or admin status
  if (status === "loading" || isCheckingAdmin) {
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
          <h1 className="text-2xl font-bold mb-4">Resolve Dispute</h1>
          <p className="text-muted-foreground">
            Please connect your wallet to access this page
          </p>
        </Card>
      </main>
    );
  }

  // Check if user is admin
  if (!isAdmin) {
    return (
      <main className="flex-1 container mx-auto px-4 py-12">
        <Card className="p-8 text-center max-w-md mx-auto border-yellow-300 dark:border-yellow-700">
          <ShieldAlert className="h-12 w-12 mx-auto mb-4 text-yellow-600 dark:text-yellow-400" />
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You must be an admin to resolve disputes.
          </p>
          <Button onClick={() => router.push("/")}>Go to Homepage</Button>
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
          <p className="text-muted-foreground">Loading dispute details...</p>
        </div>
      </main>
    );
  }

  if (!dispute) {
    return (
      <main className="flex-1 container mx-auto px-4 py-12">
        <Card className="p-8 text-center max-w-md mx-auto border-red-300 dark:border-red-700">
          <h1 className="text-2xl font-bold mb-4 text-red-600 dark:text-red-400">
            Not Found
          </h1>
          <p className="text-muted-foreground">Dispute not found</p>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex-1 container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Resolve Dispute</h1>
          <AddressDisplay address={escrowAddress} className="text-muted-foreground" />
        </div>

        {/* Escrow Details */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Escrow Details</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Depositor</p>
                <AddressDisplay address={dispute.depositor} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Recipient</p>
                <AddressDisplay address={dispute.recipient} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Escrow Amount</p>
                <p className="text-lg font-semibold">
                  {formatEther(BigInt(dispute.escrowAmount))} cUSD
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Platform Fee</p>
                <p className="text-lg font-semibold">
                  {formatEther(BigInt(dispute.platformFee))} cUSD
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Dispute Bond</p>
                <p className="text-lg font-semibold">
                  {formatEther(BigInt(dispute.disputeBond))} cUSD
                </p>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-1">Created</p>
              <p className="text-sm">
                {new Date(Number(dispute.createdAt) * 1000).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        {/* Resolution Form */}
        <ResolveForm
          escrowAddress={escrowAddress}
          disputeReason={dispute.disputeReason}
          deliverableTitle={dispute.deliverable?.title}
          deliverableDescription={dispute.deliverable?.description}
          acceptanceCriteria={dispute.deliverable?.acceptanceCriteria}
        />
      </div>
    </main>
  );
}

