"use client";

import { type Address } from "viem";
import { EscrowCard } from "./escrow-card";
import { type EscrowState } from "@/lib/escrow-config";

export interface EscrowListItem {
  address: Address;
  depositor: Address;
  recipient: Address;
  amount: bigint;
  state: EscrowState;
  createdAt: bigint;
  title?: string;
}

interface EscrowListProps {
  escrows: EscrowListItem[];
  currentUserAddress?: Address;
  emptyMessage?: string;
}

/**
 * Escrow List Component
 * Displays a grid of escrow cards
 */
export function EscrowList({
  escrows,
  currentUserAddress,
  emptyMessage = "No escrows found",
}: EscrowListProps) {
  if (escrows.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {escrows.map((escrow) => (
        <EscrowCard
          key={escrow.address}
          address={escrow.address}
          depositor={escrow.depositor}
          recipient={escrow.recipient}
          amount={escrow.amount}
          state={escrow.state}
          createdAt={escrow.createdAt}
          currentUserAddress={currentUserAddress}
          title={escrow.title}
        />
      ))}
    </div>
  );
}

