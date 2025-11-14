"use client";

import Link from "next/link";
import { type Address } from "viem";
import { Card } from "@/components/ui/card";
import { AddressDisplay } from "@/components/wallet/address-display";
import { EscrowState, formatEscrowState, getStateColor } from "@/lib/escrow-config";
import { formatRelativeTime } from "@/lib/utils";
import { formatAmount } from "@/lib/format-utils";
import { isDepositor, isRecipient } from "@/lib/address-utils";
import { ArrowRight } from "lucide-react";

interface EscrowCardProps {
  address: Address;
  depositor: Address;
  recipient: Address;
  amount: bigint;
  state: EscrowState;
  createdAt: bigint;
  currentUserAddress?: Address;
  title?: string;
  chainId?: number;
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
  chainId,
}: EscrowCardProps) {
  // Format state for display with appropriate styling
  const stateText = formatEscrowState(state);
  const stateColor = getStateColor(state);

  // Format relative time
  const relativeTime = formatRelativeTime(createdAt);

  // Check if user is depositor or recipient
  const userIsDepositor = isDepositor(currentUserAddress, { depositor });
  const userIsRecipient = isRecipient(currentUserAddress, { recipient });

  return (
    <Link href={`/escrow/${address}`}>
      <Card className="p-4 hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-primary hover:bg-primary/10">
        <div className="space-y-3">
          {/* Title + Status Badge (inline) */}
          <div className="flex justify-between items-center gap-2">
            <h3 className="text-base font-semibold truncate">{title || "Payment"}</h3>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${stateColor}`}>
              {stateText}
            </span>
          </div>

          {/* Date + Amount (inline with amount right-aligned) */}
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">{relativeTime}</span>
            <span className="font-semibold">{formatAmount(amount, chainId)}</span>
          </div>

          {/* Addresses with arrow (depositor left, arrow center, recipient right) */}
          <div className="flex justify-center pt-2">
            <div className="relative flex items-center justify-between w-full max-w-[640px]">
              {userIsDepositor ? (
                <span className="text-sm text-primary font-medium">You</span>
              ) : (
                <AddressDisplay address={depositor} showCopy={false} showExplorer={false} className="text-xs" />
              )}
              <ArrowRight className="absolute left-1/2 -translate-x-1/2 h-4 w-4 text-muted-foreground flex-shrink-0" />
              {userIsRecipient ? (
                <span className="text-sm text-primary font-medium">You</span>
              ) : (
                <AddressDisplay address={recipient} showCopy={false} showExplorer={false} className="text-xs" />
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

