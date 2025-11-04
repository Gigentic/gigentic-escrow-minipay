import { redirect } from "next/navigation";
import { type Address } from "viem";
import { Card } from "@/components/ui/card";
import { ResolveForm } from "@/components/admin/resolve-form";
import { AddressDisplay } from "@/components/wallet/address-display";
import { requireAdmin } from "@/lib/server-auth";
import { createPublicClient, http } from "viem";
import { celoSepolia, hardhat, celo } from "viem/chains";
import {
  ESCROW_CONTRACT_ABI,
  EscrowState,
} from "@/lib/escrow-config";
import { getKVClient, kvKeys } from "@/lib/kv";
import type { DisputeDocument, DeliverableDocument } from "@/lib/types";
import { formatEther } from "viem";

// Force dynamic rendering - this page uses session/auth
export const dynamic = 'force-dynamic';

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

// Helper to get the correct chain based on chainId
function getChain(chainId: number) {
  switch (chainId) {
    case 31337:
      return hardhat;
    case 42220:
      return celo;
    case 11142220:
      return celoSepolia;
    default:
      return celoSepolia;
  }
}

export default async function ResolveDisputePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { chainId?: string };
}) {
  // Server-side admin check - redirects if not admin
  try {
    await requireAdmin();
  } catch (error) {
    redirect("/");
  }

  const escrowAddress = params.id as Address;
  // Default to Celo Sepolia testnet
  const chainId = searchParams.chainId ? parseInt(searchParams.chainId, 10) : 11142220;

  let dispute: DisputeDetails | null = null;
  let error = "";

  try {
    // Create public client and KV client
    const publicClient = createPublicClient({
      chain: getChain(chainId),
      transport: http(),
    });
    const kv = getKVClient();

    // Get escrow details
    const details = await publicClient.readContract({
      address: escrowAddress,
      abi: ESCROW_CONTRACT_ABI,
      functionName: "getDetails",
    });

    const state = details[5] as EscrowState;

    if (state !== EscrowState.DISPUTED) {
      error = "Escrow is not in disputed state";
    } else {
      // Get dispute info
      const disputeInfo = await publicClient.readContract({
        address: escrowAddress,
        abi: ESCROW_CONTRACT_ABI,
        functionName: "getDisputeInfo",
      });

      // Fetch dispute reason from KV directly
      const [disputeReasonHash] = disputeInfo;
      const disputeDoc = await kv.get<DisputeDocument>(kvKeys.dispute(chainId, disputeReasonHash as string));
      const actualDisputeReason = disputeDoc?.reason || "Dispute reason not found";

      // Get deliverable document from KV directly
      const deliverable = await kv.get<DeliverableDocument>(kvKeys.deliverable(chainId, escrowAddress));

      dispute = {
        address: escrowAddress,
        depositor: details[0],
        recipient: details[1],
        escrowAmount: details[2].toString(),
        platformFee: details[3].toString(),
        disputeBond: details[4].toString(),
        deliverableHash: details[6],
        createdAt: details[7].toString(),
        disputeReason: actualDisputeReason,
        deliverable: deliverable || undefined,
      };
    }
  } catch (err: any) {
    console.error("Error fetching dispute:", err);
    error = err.message || "Failed to load dispute details";
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
          chainId={chainId}
          disputeReason={dispute.disputeReason}
          deliverableTitle={dispute.deliverable?.title}
          deliverableDescription={dispute.deliverable?.description}
          acceptanceCriteria={dispute.deliverable?.acceptanceCriteria}
        />
      </div>
    </main>
  );
}
