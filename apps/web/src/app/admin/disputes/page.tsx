import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { DisputeList } from "@/components/admin/dispute-list";
import { requireAdmin } from "@/lib/server-auth";
import { createPublicClient, http, type Address } from "viem";
import { celoSepolia, hardhat, celo } from "viem/chains";
import {
  getMasterFactoryAddress,
  MASTER_FACTORY_ABI,
  ESCROW_CONTRACT_ABI,
  EscrowState,
} from "@/lib/escrow-config";
import { getKVClient, kvKeys } from "@/lib/kv";
import type { DisputeDocument } from "@/lib/types";

// Force dynamic rendering - this page uses session/auth
export const dynamic = 'force-dynamic';

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

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: { chainId?: string };
}) {
  // Server-side admin check - redirects if not admin
  try {
    await requireAdmin();
  } catch (error) {
    console.error("[Admin Disputes] Access denied:", error);
    redirect("/");
  }

  // Default to Celo Sepolia testnet
  const chainId = searchParams.chainId ? parseInt(searchParams.chainId, 10) : 11142220;

  let disputes: DisputedEscrow[] = [];
  let error = "";

  try {
    const factoryAddress = getMasterFactoryAddress(chainId);

    // Create public client and KV client
    const publicClient = createPublicClient({
      chain: getChain(chainId),
      transport: http(),
    });
    const kv = getKVClient();

    // Get all escrows
    const allEscrows = await publicClient.readContract({
      address: factoryAddress,
      abi: MASTER_FACTORY_ABI,
      functionName: "getAllEscrows",
    });

    // Filter for disputed escrows - parallel execution for performance
    const disputedEscrowsData = await Promise.all(
      allEscrows.map(async (escrowAddress) => {
        try {
          const details = await publicClient.readContract({
            address: escrowAddress as Address,
            abi: ESCROW_CONTRACT_ABI,
            functionName: "getDetails",
          });

          const state = details[5] as EscrowState;

          if (state === EscrowState.DISPUTED) {
            const disputeInfo = await publicClient.readContract({
              address: escrowAddress as Address,
              abi: ESCROW_CONTRACT_ABI,
              functionName: "getDisputeInfo",
            });

            // Fetch dispute reason from KV directly
            const [disputeReasonHash] = disputeInfo;
            const disputeDoc = await kv.get<DisputeDocument>(kvKeys.dispute(chainId, disputeReasonHash as string));
            const actualDisputeReason = disputeDoc?.reason || "Dispute reason not found";

            return {
              address: escrowAddress,
              depositor: details[0],
              recipient: details[1],
              escrowAmount: details[2].toString(),
              platformFee: details[3].toString(),
              disputeBond: details[4].toString(),
              deliverableHash: details[6],
              createdAt: details[7].toString(),
              disputeReason: actualDisputeReason,
            };
          }
          return null;
        } catch (error) {
          console.error(`Error fetching escrow ${escrowAddress}:`, error);
          return null;
        }
      })
    );

    disputes = disputedEscrowsData.filter((escrow) => escrow !== null) as DisputedEscrow[];
  } catch (err: any) {
    console.error("Error fetching disputes:", err);
    error = err.message || "Failed to load disputes";
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

        <DisputeList disputes={disputes} isLoading={false} />
      </div>
    </main>
  );
}
