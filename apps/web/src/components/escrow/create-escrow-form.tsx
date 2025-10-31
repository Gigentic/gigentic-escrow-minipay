"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { parseEther, type Address } from "viem";
import { Card } from "@/components/ui/card";
import {
  ERC20_ABI,
  CUSD_ADDRESS,
  MASTER_FACTORY_ADDRESS,
  calculateTotalRequired,
} from "@/lib/escrow-config";
import { useRouter } from "next/navigation";
import { useCreateEscrow } from "@/hooks/use-create-escrow";
import { useApproveSpendingCap } from "@/hooks/use-approve-spending-cap";
import { CreateEscrowFormCard } from "./create-escrow-form-card";
import { CreateEscrowReviewModal } from "./create-escrow-review-modal";

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
      // Navigate to escrow details page with success modal
      router.push(`/escrow/${data.escrowAddress}?success=true`);
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
    <div className="max-w-2xl mx-auto">
      <CreateEscrowFormCard
        recipient={recipient}
        setRecipient={setRecipient}
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        amount={amount}
        setAmount={setAmount}
        balance={balance}
        totalRequired={totalRequired}
        error={error}
        createError={createError}
        onReviewClick={handleReviewClick}
      />

      <CreateEscrowReviewModal
        open={showReviewModal}
        onOpenChange={setShowReviewModal}
        recipient={recipient}
        amount={amount}
        title={title}
        description={description}
        needsApproval={!!needsApproval}
        approvalCompleted={approvalCompleted}
        isApproving={isApproving}
        isCreating={isCreating}
        onApprove={handleApproveSpendingCap}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

