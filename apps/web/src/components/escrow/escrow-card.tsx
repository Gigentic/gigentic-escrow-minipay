"use client";

import Link from "next/link";
import { type Address } from "viem";
import { formatEther } from "viem";
import { Card } from "@/components/ui/card";
import { AddressDisplay } from "@/components/wallet/address-display";
import { EscrowState, formatEscrowState, getStateColor } from "@/lib/escrow-config";
import { formatRelativeTime } from "@/lib/utils";
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
  currentUserAddress: _currentUserAddress,
  title,
}: EscrowCardProps) {
  // Format state for display with appropriate styling
  const stateText = formatEscrowState(state);
  const stateColor = getStateColor(state);

  // Format relative time
  const relativeTime = formatRelativeTime(createdAt);

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

          {/* Date + Amount (inline) */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{relativeTime}</span>
            <span className="text-muted-foreground">•</span>
            <span className="font-semibold">{formatEther(amount)} cUSD</span>
          </div>

          {/* Addresses with arrow (single line) */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <AddressDisplay address={depositor} showCopy={false} showExplorer={false} className="text-xs" />
            <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <AddressDisplay address={recipient} showCopy={false} showExplorer={false} className="text-xs" />
          </div>
        </div>
      </Card>
    </Link>
  );
}

