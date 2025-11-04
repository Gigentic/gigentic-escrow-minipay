"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { type Address } from "viem";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import { EscrowState } from "@/lib/escrow-config";
import { useCompleteEscrow } from "@/hooks/use-complete-escrow";
import { useDisputeEscrow } from "@/hooks/use-dispute-escrow";
import { isDepositor, isRecipient, isParty } from "@/lib/address-utils";

interface EscrowActionsProps {
  escrowAddress: Address;
  depositor: Address;
  recipient: Address;
  state: EscrowState;
  onActionComplete?: () => void | Promise<void>;
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
  onActionComplete,
}: EscrowActionsProps) {
  const { address: userAddress, isConnected } = useAccount();
  const {
    completeEscrowAsync,
    isCompleting,
    error: completeError,
  } = useCompleteEscrow({
    onSuccess: async () => {
      // Call the parent's refetch function after successful completion
      if (onActionComplete) {
        await onActionComplete();
      }
    },
  });
  const {
    raiseDisputeAsync,
    isRaisingDispute,
    error: disputeError,
  } = useDisputeEscrow({
    onSuccess: async () => {
      // Call the parent's refetch function after successful dispute
      if (onActionComplete) {
        await onActionComplete();
      }
    },
  });

  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Determine user's role using utilities
  const userIsDepositor = isDepositor(userAddress, { depositor });
  const userIsRecipient = isRecipient(userAddress, { recipient });
  const userIsParty = isParty(userAddress, { depositor, recipient });

  // Handle complete escrow
  const handleComplete = async () => {
    if (!isConnected || !userIsDepositor) return;

    setError("");
    setSuccess("");

    try {
      await completeEscrowAsync(escrowAddress);
      setSuccess(
        "Escrow completed successfully! Funds have been released to the recipient."
      );
    } catch (err: any) {
      console.error("Error completing escrow:", err);
      setError(err.message || "Failed to complete escrow");
    }
  };

  // Handle dispute
  const handleDisputeSubmit = async () => {
    if (!isConnected || !userIsParty || !userAddress) return;
    if (!disputeReason.trim()) {
      setError("Please provide a reason for the dispute");
      return;
    }

    setError("");
    setSuccess("");

    try {
      await raiseDisputeAsync({
        escrowAddress,
        reason: disputeReason.trim(),
      });

      setSuccess("Dispute raised successfully. An arbiter will review the case.");
      setShowDisputeModal(false);
      setDisputeReason("");
    } catch (err: any) {
      console.error("Error raising dispute:", err);
      setError(err.message || "Failed to raise dispute");
    }
  };

  if (!isConnected) {
    return null;
  }

  if (!userIsParty) {
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
        {(error || completeError || disputeError) && (
          <div className="mb-4 bg-red-100 dark:bg-red-900 p-3 rounded-md">
            <p className="text-sm text-red-800 dark:text-red-100">
              {error || completeError?.message || disputeError?.message}
            </p>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-100 dark:bg-green-900 p-3 rounded-md">
            <p className="text-sm text-green-800 dark:text-green-100">{success}</p>
          </div>
        )}

        {/* CREATED state actions */}
        {state === EscrowState.CREATED && !success && (
          <div className="space-y-3">
            {userIsDepositor && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-2">
                  As the depositor, you can complete this escrow to release funds to the recipient,
                  or raise a dispute if there are issues.
                </p>
                <Button
                  onClick={handleComplete}
                  disabled={isCompleting || isRaisingDispute}
                  className="w-full"
                  size="lg"
                >
                  {isCompleting ? "Processing..." : "Complete Escrow"}
                </Button>
              </div>
            )}

            {userIsRecipient && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-2">
                  You are the recipient of this escrow. Wait for the depositor to complete the escrow,
                  or raise a dispute if needed.
                </p>
              </div>
            )}

            <Button
              onClick={() => setShowDisputeModal(true)}
              disabled={isCompleting || isRaisingDispute}
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
              This escrow is currently under dispute. An arbiter will review and resolve it.
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
      <ResponsiveDialog open={showDisputeModal} onOpenChange={setShowDisputeModal}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Raise Dispute</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Provide a clear reason for the dispute. 
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="space-y-4">
            <Textarea
              placeholder="Explain and provide evidence why you are disputing this escrow..."
              className="w-full px-4 py-2 border rounded-md min-h-[120px]"
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              maxLength={3000}
            />
            <p className="text-sm text-muted-foreground">
              Link to evidence (e.g. screenshots, videos, documents on{" "}
              <a
                href="https://drive.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                GDrive
              </a>
              ,{" "}
              <a
                href="https://www.dropbox.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Dropbox
              </a>
              ,{" "}
              <a
                href="https://send.internxt.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Internxt
              </a>
              , etc.) to support your argument.
            </p>
            <p className="text-sm text-muted-foreground">
              An arbiter will shortly review your case.
            </p>
          </div>

          <ResponsiveDialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowDisputeModal(false);
                setDisputeReason("");
                setError("");
              }}
              disabled={isCompleting || isRaisingDispute}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDisputeSubmit}
              disabled={isCompleting || isRaisingDispute || !disputeReason.trim()}
            >
              {isRaisingDispute ? "Submitting..." : "Submit Dispute"}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}

