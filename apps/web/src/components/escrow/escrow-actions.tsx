"use client";

import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { type Address } from "viem";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ESCROW_CONTRACT_ABI,
  EscrowState,
} from "@/lib/escrow-config";

interface EscrowActionsProps {
  escrowAddress: Address;
  depositor: Address;
  recipient: Address;
  state: EscrowState;
  onSuccess?: () => void;
}

/**
 * Escrow Actions Component
 * Provides Complete and Dispute buttons based on user role and escrow state
 */
export function EscrowActions({
  escrowAddress,
  depositor,
  recipient,
  state,
  onSuccess,
}: EscrowActionsProps) {
  const { address: userAddress, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [isProcessing, setIsProcessing] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Determine user's role
  const isDepositor = userAddress?.toLowerCase() === depositor.toLowerCase();
  const isRecipient = userAddress?.toLowerCase() === recipient.toLowerCase();
  const isParty = isDepositor || isRecipient;

  // Handle complete escrow
  const handleComplete = async () => {
    if (!isConnected || !isDepositor) return;

    setIsProcessing(true);
    setError("");
    setSuccess("");

    try {
      const tx = await writeContractAsync({
        address: escrowAddress,
        abi: ESCROW_CONTRACT_ABI,
        functionName: "complete",
      });

      console.log("Complete tx:", tx);
      setSuccess("Escrow completed successfully! Funds have been released to the recipient.");
      
      if (onSuccess) {
        setTimeout(() => onSuccess(), 2000);
      }
    } catch (err: any) {
      console.error("Error completing escrow:", err);
      setError(err.message || "Failed to complete escrow");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle dispute
  const handleDisputeSubmit = async () => {
    if (!isConnected || !isParty) return;
    if (!disputeReason.trim()) {
      setError("Please provide a reason for the dispute");
      return;
    }

    setIsProcessing(true);
    setError("");
    setSuccess("");

    try {
      const tx = await writeContractAsync({
        address: escrowAddress,
        abi: ESCROW_CONTRACT_ABI,
        functionName: "dispute",
        args: [disputeReason],
      });

      console.log("Dispute tx:", tx);
      setSuccess("Dispute raised successfully. An arbiter will review the case.");
      setShowDisputeModal(false);
      setDisputeReason("");
      
      if (onSuccess) {
        setTimeout(() => onSuccess(), 2000);
      }
    } catch (err: any) {
      console.error("Error raising dispute:", err);
      setError(err.message || "Failed to raise dispute");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isConnected) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-center">
          Please connect your wallet to interact with this escrow
        </p>
      </Card>
    );
  }

  if (!isParty) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-center">
          Only the depositor or recipient can take actions on this escrow
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Actions</h2>

        {/* Status messages */}
        {error && (
          <div className="mb-4 bg-red-100 dark:bg-red-900 p-3 rounded-md">
            <p className="text-sm text-red-800 dark:text-red-100">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-100 dark:bg-green-900 p-3 rounded-md">
            <p className="text-sm text-green-800 dark:text-green-100">{success}</p>
          </div>
        )}

        {/* CREATED state actions */}
        {state === EscrowState.CREATED && (
          <div className="space-y-3">
            {isDepositor && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-2">
                  As the depositor, you can complete this escrow to release funds to the recipient,
                  or raise a dispute if there are issues.
                </p>
                <Button
                  onClick={handleComplete}
                  disabled={isProcessing}
                  className="w-full"
                  size="lg"
                >
                  {isProcessing ? "Processing..." : "Complete Escrow"}
                </Button>
              </div>
            )}

            {isRecipient && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-2">
                  You are the recipient of this escrow. Wait for the depositor to complete the escrow,
                  or raise a dispute if needed.
                </p>
              </div>
            )}

            <Button
              onClick={() => setShowDisputeModal(true)}
              disabled={isProcessing}
              variant="outline"
              className="w-full"
            >
              Raise Dispute
            </Button>
          </div>
        )}

        {/* DISPUTED state */}
        {state === EscrowState.DISPUTED && (
          <div className="text-center py-4">
            <p className="text-muted-foreground">
              This escrow is currently under dispute. An arbiter will review and resolve the case.
            </p>
          </div>
        )}

        {/* COMPLETED state */}
        {state === EscrowState.COMPLETED && (
          <div className="text-center py-4">
            <p className="text-green-600 dark:text-green-400 font-medium">
              This escrow has been completed. Funds have been released to the recipient.
            </p>
          </div>
        )}

        {/* REFUNDED state */}
        {state === EscrowState.REFUNDED && (
          <div className="text-center py-4">
            <p className="text-muted-foreground">
              This escrow has been refunded. Funds have been returned to the depositor.
            </p>
          </div>
        )}
      </Card>

      {/* Dispute Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-xl font-semibold mb-4">Raise Dispute</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Provide a clear reason for the dispute. An arbiter will review your case.
            </p>

            <textarea
              className="w-full px-4 py-2 border rounded-md min-h-[120px] mb-4"
              placeholder="Explain why you are disputing this escrow..."
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              maxLength={256}
            />

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDisputeModal(false);
                  setDisputeReason("");
                  setError("");
                }}
                disabled={isProcessing}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDisputeSubmit}
                disabled={isProcessing || !disputeReason.trim()}
                className="flex-1"
              >
                {isProcessing ? "Submitting..." : "Submit Dispute"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

