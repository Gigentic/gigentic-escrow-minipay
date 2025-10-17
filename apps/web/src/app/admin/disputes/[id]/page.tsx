"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import { type Address } from "viem";
import { Card } from "@/components/ui/card";
import { ResolveForm } from "@/components/admin/resolve-form";
import { AddressDisplay } from "@/components/wallet/address-display";
import { formatEther } from "viem";

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
  const { address, isConnected } = useAccount();
  const escrowAddress = params.id as Address;

  const [dispute, setDispute] = useState<DisputeDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const isAdmin =
    isConnected &&
    process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS?.toLowerCase() === address?.toLowerCase();

  useEffect(() => {
    const fetchDispute = async () => {
      if (!isAdmin || !address) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/admin/disputes/${escrowAddress}`, {
          headers: {
            "x-wallet-address": address,
          },
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
  }, [isAdmin, address, escrowAddress]);

  if (!isConnected) {
    return (
      <main className="flex-1 container mx-auto px-4 py-12">
        <Card className="p-8 text-center max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-4">Resolve Dispute</h1>
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

  if (isLoading) {
    return (
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-muted-foreground">Loading dispute details...</p>
        </div>
      </main>
    );
  }

  if (error || !dispute) {
    return (
      <main className="flex-1 container mx-auto px-4 py-12">
        <Card className="p-8 text-center max-w-md mx-auto border-red-300 dark:border-red-700">
          <h1 className="text-2xl font-bold mb-4 text-red-600 dark:text-red-400">
            Error
          </h1>
          <p className="text-muted-foreground">{error || "Dispute not found"}</p>
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

