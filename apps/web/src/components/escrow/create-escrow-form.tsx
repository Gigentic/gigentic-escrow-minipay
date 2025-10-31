"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { parseEther, type Address } from "viem";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ERC20_ABI,
  CUSD_ADDRESS,
  MASTER_FACTORY_ADDRESS,
  calculateTotalRequired,
} from "@/lib/escrow-config";
import { useRouter } from "next/navigation";
import { useCreateEscrow } from "@/hooks/use-create-escrow";
import { useApproveSpendingCap } from "@/hooks/use-approve-spending-cap";
import { Info, Check } from "lucide-react";

/**
 * Create Escrow Form Component
 * Multi-step form for creating a new escrow
 */
export function CreateEscrowForm({ initialAmount }: { initialAmount?: string }) {
  const router = useRouter();
  const { address: userAddress, isConnected } = useAccount();
  const { createEscrowAsync, isCreating, error: createError } = useCreateEscrow({
    onSuccess: async (data) => {
      console.log("Escrow created successfully:", data.escrowAddress);
      // Navigate to dashboard after successful creation and cache invalidation
      router.push("/dashboard");
    },
    onError: (err) => {
      console.error("Error in create escrow hook:", err);
      setError(err.message || "Failed to create escrow");
    },
  });

  // Form state
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState(initialAmount || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [allowanceRefetchKey, setAllowanceRefetchKey] = useState(0);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [approvalCompleted, setApprovalCompleted] = useState(false);

  // Check cUSD balance
  const { data: balance } = useReadContract({
    address: CUSD_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });

  // Calculate if spending cap is sufficient
  const amountWei = amount ? parseEther(amount) : 0n;
  const { total: totalRequired } = calculateTotalRequired(amountWei);

  // Check current spending cap (allowance)
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    address: CUSD_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: userAddress ? [userAddress, MASTER_FACTORY_ADDRESS] : undefined,
    query: {
      enabled: !!userAddress,
      refetchInterval: allowanceRefetchKey > 0 ? 1000 : false, // Poll every 1s after approval
    },
  });

  // Log current spending cap when it changes
  useEffect(() => {
    if (currentAllowance !== undefined) {
      const humanReadable = (Number(currentAllowance) / 1e18).toFixed(4);
      console.log("Current spending cap (allowance):", currentAllowance.toString(), `(${humanReadable} cUSD)`);

      // Stop polling if allowance is now sufficient
      if (allowanceRefetchKey > 0 && amount && currentAllowance >= totalRequired) {
        console.log("✅ Allowance is now sufficient, stopping polling");
        setAllowanceRefetchKey(0);
      }
    }
  }, [currentAllowance, allowanceRefetchKey, totalRequired, amount]);

  // Hook for approving spending cap
  const { approveSpendingCapAsync, isApproving, error: approvalError } = useApproveSpendingCap({
    onSuccess: async (txHash) => {
      console.log("Spending cap approved, refetching allowance...");
      // Enable polling to refetch allowance
      setAllowanceRefetchKey((prev) => prev + 1);
      // Also manually refetch immediately
      await refetchAllowance();
      setApprovalCompleted(true);
      setError("");
    },
    onError: (err) => {
      console.error("Error approving spending cap:", err);
      setError(err.message || "Failed to approve spending cap");
    },
  });

  const needsApproval = amount && currentAllowance !== undefined && currentAllowance < totalRequired;
  const hasValidAmount = amount && parseFloat(amount) > 0;

  // Validation
  const validateForm = (): boolean => {
    if (!recipient || !amount || !title || !description) {
      setError("Please fill in all fields");
      return false;
    }

    // Validate recipient address
    if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
      setError("Invalid recipient address");
      return false;
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Amount must be greater than 0");
      return false;
    }

    if (amountNum > 100) {
      setError("Amount cannot exceed $100 in beta testing");
      return false;
    }

    // Check if user has enough balance
    if (balance) {
      const amountWei = parseEther(amount);
      const { total } = calculateTotalRequired(amountWei);
      if (balance < total) {
        setError("Insufficient cUSD balance");
        return false;
      }
    }

    setError("");
    return true;
  };

  const handleReviewClick = () => {
    if (!validateForm()) return;
    setError("");
    setShowReviewModal(true);
    // Reset approval state when opening modal
    setApprovalCompleted(false);
  };

  const handleApproveSpendingCap = async () => {
    if (!hasValidAmount) {
      setError("Please enter a valid amount");
      return;
    }

    setError("");

    try {
      const amountWei = parseEther(amount);
      const { total } = calculateTotalRequired(amountWei);
      await approveSpendingCapAsync(total);
    } catch (err: any) {
      console.error("Error approving spending cap:", err);
      if (!approvalError) {
        setError(err.message || "Failed to approve spending cap");
      }
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!userAddress || !isConnected) {
      setError("Please connect your wallet");
      return;
    }

    setError("");

    try {
      const amountWei = parseEther(amount);

      // Call the hook with properly typed parameters
      // Navigation to dashboard is handled in the onSuccess callback
      await createEscrowAsync({
        recipient: recipient as Address,
        amount: amountWei,
        deliverable: {
          title,
          description,
          acceptanceCriteria: [],
        },
      });

      // Close modal on success
      setShowReviewModal(false);
    } catch (err: any) {
      // Error handling is done in the onError callback, but we still catch
      // in case there's an error with parameter validation
      console.error("Error creating escrow:", err);
      if (!createError) {
        setError(err.message || "Failed to create escrow");
      }
    }
  };

  if (!isConnected) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Please connect your wallet to create an escrow</p>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="max-w-2xl mx-auto">
        <Card className="p-6">
          <div className="space-y-6">
            {/* Recipient Address */}
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Address *</Label>
              <Input
                id="recipient"
                type="text"
                placeholder="0x..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
            </div>

            {/* Work Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Work Title *</Label>
              <Input
                id="title"
                type="text"
                placeholder="e.g. Logo design"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Work Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Work Description *</Label>
              <Textarea
                id="description"
                placeholder="e.g. Create 3 logo concepts with source files"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={10000}
                className="min-h-[100px]"
              />
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Be specific to avoid disputes</span>
                <span>{description.length}/10000</span>
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (cUSD) *</Label>
              <Input
                id="amount"
                type="text"
                inputMode="decimal"
                placeholder="1.00"
                value={amount}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow only numbers and decimal point
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    setAmount(value);
                  }
                }}
              />
            </div>

            {/* Real-time Breakdown */}
            {amount && (
              <div className="border rounded-md p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Recipient receives:</span>
                  <span className="font-medium">${amount} cUSD</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Platform fee:</span>
                  <span>${(parseFloat(amount) * 0.01).toFixed(2)} cUSD</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span>Refundable bond:</span>
                  </div>
                  <span>${(parseFloat(amount) * 0.04).toFixed(2)} cUSD</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2 mt-2">
                  <span>Total you pay:</span>
                  <span>${(parseFloat(amount) * 1.05).toFixed(2)} cUSD</span>
                </div>
              </div>
            )}

            {/* Balance Display */}
            {balance !== undefined && (
              <div className="flex items-center gap-2 text-sm">
                <span>Your balance: ${(Number(balance) / 1e18).toFixed(2)} cUSD</span>
                {balance >= totalRequired && <Check className="h-4 w-4 text-green-600" />}
              </div>
            )}

            {/* Error Display */}
            {(error || createError) && (
              <div className="bg-red-100 dark:bg-red-900 p-3 rounded-md">
                <p className="text-sm text-red-800 dark:text-red-100">
                  {error || createError?.message}
                </p>
              </div>
            )}

            {/* Review & Create Button */}
            <Button
              onClick={handleReviewClick}
              className="w-full"
              size="lg"
            >
              Review & Create Escrow
            </Button>
          </div>
        </Card>

        {/* Review Modal */}
        <ResponsiveDialog open={showReviewModal} onOpenChange={setShowReviewModal}>
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
                    onClick={handleApproveSpendingCap}
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
                  onClick={handleSubmit}
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
                onClick={() => setShowReviewModal(false)}
                disabled={isApproving || isCreating}
              >
                Cancel
              </Button>
            </ResponsiveDialogFooter>
          </ResponsiveDialogContent>
        </ResponsiveDialog>
      </div>
    </TooltipProvider>
  );
}

