"use client";

import { type Address } from "viem";
import { formatEther } from "viem";
import { Card } from "@/components/ui/card";
import { AddressDisplay } from "@/components/wallet/address-display";
import { type EscrowDetails, EscrowState, formatEscrowState } from "@/lib/escrow-config";
import { shortenHash } from "@/lib/hash";

interface EscrowDetailsDisplayProps {
  escrowAddress: Address;
  details: EscrowDetails;
  deliverable?: {
    title: string;
    description: string;
    acceptanceCriteria?: string[];
    category?: string;
  };
  disputeInfo?: {
    disputeReason: string;
    resolutionHash?: string;
  };
}

/**
 * Escrow Details Component
 * Displays full information about an escrow including deliverable details
 */
export function EscrowDetailsDisplay({
  escrowAddress,
  details,
  deliverable,
  disputeInfo,
}: EscrowDetailsDisplayProps) {
  const stateText = formatEscrowState(details.state);
  const stateColor = {
    [EscrowState.CREATED]: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
    [EscrowState.DISPUTED]: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
    [EscrowState.COMPLETED]: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    [EscrowState.REFUNDED]: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100",
  }[details.state];

  const createdDate = new Date(Number(details.createdAt) * 1000).toLocaleString();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Escrow Details</h1>
          <AddressDisplay address={escrowAddress} className="text-muted-foreground" />
        </div>
        <span className={`px-4 py-2 rounded-full text-sm font-medium ${stateColor}`}>
          {stateText}
        </span>
      </div>

      {/* Parties & Amounts */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Transaction Details</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Depositor</p>
              <AddressDisplay address={details.depositor} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Recipient</p>
              <AddressDisplay address={details.recipient} />
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Escrow Amount</p>
                <p className="text-lg font-semibold">{formatEther(details.escrowAmount)} cUSD</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Platform Fee (1%)</p>
                <p className="text-lg font-semibold">{formatEther(details.platformFee)} cUSD</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Dispute Bond (4%)</p>
                <p className="text-lg font-semibold">{formatEther(details.disputeBond)} cUSD</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-2">Created</p>
            <p className="text-sm">{createdDate}</p>
          </div>
        </div>
      </Card>

      {/* Deliverable */}
      {deliverable && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Deliverable</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">{deliverable.title}</h3>
              {deliverable.category && (
                <span className="inline-block px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded mb-3">
                  {deliverable.category}
                </span>
              )}
              <p className="text-muted-foreground">{deliverable.description}</p>
            </div>

            {deliverable.acceptanceCriteria && deliverable.acceptanceCriteria.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Acceptance Criteria</h4>
                <ul className="list-disc list-inside space-y-1">
                  {deliverable.acceptanceCriteria.map((criteria, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      {criteria}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground">
                Deliverable Hash: {shortenHash(details.deliverableHash)}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Dispute Info */}
      {details.state === EscrowState.DISPUTED && disputeInfo && (
        <Card className="p-6 border-yellow-300 dark:border-yellow-700">
          <h2 className="text-xl font-semibold mb-4 text-yellow-800 dark:text-yellow-200">
            Dispute Information
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Dispute Reason</p>
              <p className="text-sm">{disputeInfo.disputeReason}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              This escrow is currently under dispute and awaits arbiter resolution.
            </p>
          </div>
        </Card>
      )}

      {/* Resolution Info */}
      {(details.state === EscrowState.COMPLETED || details.state === EscrowState.REFUNDED) &&
        disputeInfo?.resolutionHash &&
        disputeInfo.resolutionHash !== "0x0000000000000000000000000000000000000000000000000000000000000000" && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Resolution</h2>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                This escrow was resolved through dispute resolution.
              </p>
              <p className="text-xs text-muted-foreground">
                Resolution Hash: {shortenHash(disputeInfo.resolutionHash)}
              </p>
            </div>
          </Card>
        )}
    </div>
  );
}

