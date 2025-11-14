"use client";

import Link from "next/link";
import { formatUnits, type Address } from "viem";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddressDisplay } from "@/components/wallet/address-display";
import { getStablecoinDecimals, getStablecoinSymbol } from "@/lib/escrow-config";

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

interface DisputeListProps {
  disputes: DisputedEscrow[];
  isLoading?: boolean;
  chainId: number;
}

/**
 * Dispute List Component
 * Displays a table of disputed escrows for admin review
 */
export function DisputeList({ disputes, isLoading, chainId }: DisputeListProps) {
  if (isLoading) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Loading disputes...</p>
      </Card>
    );
  }

  if (disputes.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No disputes found</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {disputes.map((dispute) => (
        <Card key={dispute.address} className="p-6 hover:shadow-lg transition-shadow">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Disputed Escrow</h3>
                <AddressDisplay address={dispute.address} />
              </div>
              <Link href={`/admin/disputes/${dispute.address}?chainId=${chainId}`}>
                <Button>Review & Resolve</Button>
              </Link>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Depositor</p>
                <AddressDisplay address={dispute.depositor} showCopy={false} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Recipient</p>
                <AddressDisplay address={dispute.recipient} showCopy={false} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Escrow Amount</p>
                <p className="text-lg font-semibold">
                  {formatUnits(BigInt(dispute.escrowAmount), getStablecoinDecimals(chainId))} {getStablecoinSymbol(chainId)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Created</p>
                <p className="text-sm">
                  {new Date(Number(dispute.createdAt) * 1000).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Dispute Reason */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">Dispute Reason:</p>
              <p className="text-sm text-muted-foreground">
                {dispute.disputeReason}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

