"use client";

import Link from "next/link";
import { type Address } from "viem";
import { formatEther } from "viem";
import { Card } from "@/components/ui/card";
import { AddressDisplay } from "@/components/wallet/address-display";
import { EscrowState, formatEscrowState } from "@/lib/escrow-config";

interface EscrowCardProps {
  address: Address;
  depositor: Address;
  recipient: Address;
  amount: bigint;
  state: EscrowState;
  createdAt: bigint;
  currentUserAddress?: Address;
  title?: string;
}

/**
 * Escrow Card Component
 * Displays a summary card for an escrow with key information
 */
export function EscrowCard({
  address,
  depositor,
  recipient,
  amount,
  state,
  createdAt,
  currentUserAddress,
  title,
}: EscrowCardProps) {
  // Determine user's role in this escrow
  const isDepositor = currentUserAddress?.toLowerCase() === depositor.toLowerCase();
  const isRecipient = currentUserAddress?.toLowerCase() === recipient.toLowerCase();
  const userRole = isDepositor ? "Depositor" : isRecipient ? "Recipient" : "Observer";

  // Format state for display with appropriate styling
  const stateText = formatEscrowState(state);
  const stateColor = {
    [EscrowState.CREATED]: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
    [EscrowState.DISPUTED]: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
    [EscrowState.COMPLETED]: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    [EscrowState.REFUNDED]: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100",
  }[state];

  // Format date
  const createdDate = new Date(Number(createdAt) * 1000).toLocaleDateString();

  return (
    <Link href={`/escrow/${address}`}>
      <Card className="p-6 hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-primary hover:bg-orange-500/10">
        <div className="space-y-4">
          {/* Header with state badge */}
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold mb-1">{title || "Escrow"}</h3>
              <p className="text-sm text-muted-foreground">{createdDate}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${stateColor}`}>
              {stateText}
            </span>
          </div>

          {/* Amount */}
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-1">Amount</p>
            <p className="text-2xl font-bold">{formatEther(amount)} cUSD</p>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Depositor</p>
              <AddressDisplay address={depositor} showCopy={false} showExplorer={false} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Recipient</p>
              <AddressDisplay address={recipient} showCopy={false} showExplorer={false} />
            </div>
          </div>

          {/* User role indicator */}
          {userRole !== "Observer" && (
            <div className="border-t pt-4">
              <span className="text-sm font-medium text-primary">
                Your role: {userRole}
              </span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}

