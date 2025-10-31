"use client";

import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import { Check } from "lucide-react";

interface CreateEscrowReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipient: string;
  amount: string;
  title: string;
  description: string;
  needsApproval: boolean;
  approvalCompleted: boolean;
  isApproving: boolean;
  isCreating: boolean;
  onApprove: () => void;
  onSubmit: () => void;
}

/**
 * Create Escrow Review Modal Component
 * Two-step modal for approving contract and creating escrow
 */
export function CreateEscrowReviewModal({
  open,
  onOpenChange,
  recipient,
  amount,
  title,
  description,
  needsApproval,
  approvalCompleted,
  isApproving,
  isCreating,
  onApprove,
  onSubmit,
}: CreateEscrowReviewModalProps) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Review Escrow Details</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Review the escrow information below and authorize the contract to create your escrow.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-4 py-4">
          {/* Escrow Summary */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Recipient:</span>
              <span className="font-medium">{recipient.slice(0, 6)}...{recipient.slice(-4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-medium">${amount} cUSD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Work:</span>
              <span className="font-medium">{title}</span>
            </div>
            {description && (
              <div>
                <span className="text-muted-foreground">Description:</span>
                <p className="mt-1 text-xs line-clamp-2">"{description}"</p>
              </div>
            )}
          </div>

          <div className="border-t pt-3">
            <div className="flex justify-between font-semibold">
              <span>Total payment:</span>
              <span>${(parseFloat(amount || "0") * 1.05).toFixed(2)} cUSD</span>
            </div>
          </div>

          {/* Step 1: Authorize Contract */}
          <div className="space-y-3">
            <div className="text-sm">
              <span className="font-medium">1.</span> Authorize contract to transfer your cUSD into escrow
            </div>

            {approvalCompleted || !needsApproval ? (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <Check className="h-4 w-4" />
                <span>1. CheckPay contract approved</span>
              </div>
            ) : (
              <Button
                onClick={onApprove}
                disabled={isApproving}
                className="w-full"
              >
                {isApproving ? "Approving..." : "1. Authorize Contract"}
              </Button>
            )}
          </div>

          {/* Step 2: Create Escrow */}
          <div className="space-y-3">
            <div className="text-sm">
              <span className="font-medium">2.</span> Create escrow
            </div>

            <Button
              onClick={onSubmit}
              disabled={isCreating || (!!needsApproval && !approvalCompleted)}
              className="w-full"
            >
              {isCreating ? "Creating..." : "2. Create Escrow"}
            </Button>
          </div>
        </div>

        <ResponsiveDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isApproving || isCreating}
          >
            Cancel
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
