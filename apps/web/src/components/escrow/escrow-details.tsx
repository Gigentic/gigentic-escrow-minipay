"use client";

import { useState } from "react";
import { type Address } from "viem";
import { formatEther } from "viem";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddressDisplay } from "@/components/wallet/address-display";
import { type EscrowDetails, EscrowState, formatEscrowState, getStateColor } from "@/lib/escrow-config";
import type { ResolutionDocument } from "@/lib/types";
import { shortenHash } from "@/lib/hash";
import { Lock, ChevronDown, ChevronRight } from "lucide-react";

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
  resolution?: ResolutionDocument;
  isParty: boolean;
  isConnected: boolean;
  userAddress?: Address;
}

/**
 * Payment Details Component
 * Displays full information about an escrow payment including deliverable details
 */
export function EscrowDetailsDisplay({
  escrowAddress,
  details,
  deliverable,
  disputeInfo,
  resolution,
  isParty,
  isConnected,
  userAddress,
}: EscrowDetailsDisplayProps) {
  const [showFeeBreakdown, setShowFeeBreakdown] = useState(false);

  const stateText = formatEscrowState(details.state);
  const stateColor = getStateColor(details.state);
  const createdDate = new Date(Number(details.createdAt) * 1000).toLocaleString();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Payment Details</h1>
        <AddressDisplay address={escrowAddress} showCopy={false} className="text-muted-foreground font-mono text-sm" />
      </div>

      {/* Main Payment Card */}
      <Card className="p-6">
        <div className="space-y-4">
          {/* Amount & Status */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-3xl font-bold">{formatEther(details.escrowAmount)} cUSD</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${stateColor}`}>
              {stateText}
            </span>
          </div>

          {/* From/To */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground mb-1">
                From{isConnected && userAddress?.toLowerCase() === details.depositor.toLowerCase() && <span className="text-primary font-medium"> You</span>}:
              </p>
              <AddressDisplay address={details.depositor} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground mb-1">
                To{isConnected && userAddress?.toLowerCase() === details.recipient.toLowerCase() && <span className="text-primary font-medium"> You</span>}:
              </p>
              <AddressDisplay address={details.recipient} />
            </div>
          </div>

          {/* Created time */}
          <div className="pt-1">
            <p className="text-sm text-muted-foreground">Created {createdDate}</p>
          </div>

          {/* Fee Breakdown - Collapsible */}
          {isConnected &&
            <div className="pt-2 border-t">
              <button
                onClick={() => setShowFeeBreakdown(!showFeeBreakdown)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>{showFeeBreakdown ? 'Hide' : 'Show'} Fee Breakdown</span>
                {showFeeBreakdown ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>

              {showFeeBreakdown && (
                <Card className="p-6 mt-2">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Payment</span>
                      <span className="font-medium">{formatEther(details.escrowAmount)} cUSD</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Platform Fee</span>
                      <span className="font-medium">{formatEther(details.platformFee)} cUSD</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Dispute Bond</span>
                      <span className="font-medium">{formatEther(details.disputeBond)} cUSD</span>
                    </div>
                    <div className="flex justify-between text-sm pt-3 border-t font-semibold">
                      <span>Total Locked</span>
                      <span>
                        {formatEther(
                          BigInt(details.escrowAmount) + BigInt(details.platformFee) + BigInt(details.disputeBond)
                        )} cUSD
                      </span>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          }

        </div>
      </Card>

      {/* Sign In CTA for non-authenticated users */}
      {!isConnected && (
        <Card className="p-6 bg-muted/50">
          <div className="flex flex-col items-center text-center gap-4">
            <Lock className="h-10 w-10 text-muted-foreground" />
            <div>
              <h3 className="font-semibold mb-1">Connect to View Details</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Sign in to see work details and take action
              </p>
              <Link href={`/auth/signin?redirectTo=/escrow/${escrowAddress}`}>
                <Button>Connect Wallet</Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Work Details - Only for authenticated parties */}
      {deliverable && isParty && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-3">Work Details</h2>
          <div className="space-y-3">
            <div>
              <h3 className="font-medium mb-2">{deliverable.title}</h3>
              <p className="text-sm text-muted-foreground">{deliverable.description}</p>
            </div>

            {deliverable.acceptanceCriteria && deliverable.acceptanceCriteria.length > 0 && (
              <div className="pt-3 border-t">
                <p className="text-sm font-medium mb-2">Acceptance Criteria:</p>
                <ul className="space-y-1">
                  {deliverable.acceptanceCriteria.map((criteria, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex gap-2">
                      <span>•</span>
                      <span>{criteria}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Dispute Info - Only visible to parties */}
      {isConnected && details.state === EscrowState.DISPUTED && disputeInfo && isParty && (
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

      {/* Resolution Info - Only visible to parties */}
      {isConnected &&
        (details.state === EscrowState.COMPLETED || details.state === EscrowState.REFUNDED) &&
        resolution &&
        isParty && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Resolution</h2>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This escrow was {resolution.favorDepositor ? "refunded" : "completed by the arbiter"}.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Arbiter</p>
                  <AddressDisplay address={resolution.arbiter} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Decision</p>
                  <p className="text-sm font-medium">
                    {resolution.favorDepositor ? "Favor Depositor (Refund)" : "Favor Recipient (Complete)"}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-1">Decision Rationale</p>
                <p className="text-sm">{resolution.decisionRationale}</p>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-1">Deliverable Review</p>
                <p className="text-sm">{resolution.deliverableReview}</p>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-1">Original Dispute Reason</p>
                <p className="text-sm">{resolution.disputeReason}</p>
              </div>

              <div className="border-t pt-4 text-xs text-muted-foreground space-y-1">
                <p>Resolved: {new Date(resolution.resolvedAt).toLocaleString()}</p>
                <p>Resolution Hash: {shortenHash(disputeInfo?.resolutionHash || "")}</p>
              </div>
            </div>
          </Card>
        )}
    </div>
  );
}

