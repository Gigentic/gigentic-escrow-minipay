"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Address } from "viem";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
} from "@/components/ui/responsive-dialog";
import { Copy, Check } from "lucide-react";

interface EscrowSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  escrowAddress: Address;
  amount: string;
}

export function EscrowSuccessModal({
  open,
  onOpenChange,
  escrowAddress,
  amount,
}: EscrowSuccessModalProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const escrowUrl = `${window.location.origin}/escrow/${escrowAddress}`;
  const truncatedAddress = `${escrowAddress.slice(0, 6)}...${escrowAddress.slice(-4)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(escrowUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleViewDashboard = () => {
    onOpenChange(false);
    router.push("/dashboard");
  };

  const handleCloseModal = () => {
    onOpenChange(false);
    // Remove success query parameter from URL
    router.replace(`/escrow/${escrowAddress}`, { scroll: false });
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={handleCloseModal}>
      <ResponsiveDialogContent className="sm:max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="text-2xl">
            🎉 Escrow Created Successfully!
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Your ${amount} cUSD escrow is now live on Celo Sepolia
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-6 py-4">
          {/* Escrow Info */}
          <div className="rounded-lg border p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Escrow ID:</span>
              <span className="font-mono">{truncatedAddress}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span>⏳ Awaiting Delivery</span>
            </div>
          </div>

          {/* What's Next */}
          <div className="space-y-4">
            <h3 className="font-semibold">What's next?</h3>

            <div className="space-y-4">
              {/* Step 1: Share */}
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="font-medium">1️⃣</span>
                  <span className="font-medium">Share with freelancer</span>
                </div>
                <div className="ml-6 space-y-2">
                  <div className="rounded-md border bg-muted/50 p-3">
                    <p className="text-xs font-mono break-all text-muted-foreground mb-2">
                      {escrowUrl}
                    </p>
                    <Button
                      onClick={handleCopyLink}
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Link
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Step 2: Delivery */}
              <div className="flex items-start gap-2">
                <span className="font-medium">2️⃣</span>
                <span>They deliver the work</span>
              </div>

              {/* Step 3: Release */}
              <div className="flex items-start gap-2">
                <span className="font-medium">3️⃣</span>
                <span>Come back to release payment</span>
              </div>
            </div>
          </div>

          {/* Tip */}
          <div className="rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 <strong>Tip:</strong> Bookmark this page or save the link
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleViewDashboard} variant="outline" className="flex-1">
              View Dashboard
            </Button>
            <Button onClick={handleCloseModal} className="flex-1">
              Back to Escrow Details
            </Button>
          </div>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
