"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { parseEther, type Address } from "viem";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ERC20_ABI,
  CUSD_ADDRESS,
  MASTER_FACTORY_ADDRESS,
  calculateTotalRequired,
} from "@/lib/escrow-config";
import { useRouter } from "next/navigation";
import { useCreateEscrow } from "@/hooks/use-create-escrow";
import { useApproveSpendingCap } from "@/hooks/use-approve-spending-cap";
import { Info } from "lucide-react";

/**
 * Create Escrow Form Component
 * Multi-step form for creating a new escrow
 */
export function CreateEscrowForm() {
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
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [allowanceRefetchKey, setAllowanceRefetchKey] = useState(0);
  const [showSpendingCapInfo, setShowSpendingCapInfo] = useState(false);

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
      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Create New Escrow</h2>
            <p className="text-muted-foreground">Lock funds securely and define deliverables for trustless transactions</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Recipient Address</label>
            <input
              type="text"
              className="w-full px-4 py-2 border rounded-md"
              placeholder="0x..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Amount (cUSD)</label>
            <input
              type="text"
              inputMode="decimal"
              className="w-full px-4 py-2 border rounded-md"
              placeholder="100.00"
              value={amount}
              onChange={(e) => {
                const value = e.target.value;
                // Allow only numbers and decimal point
                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                  setAmount(value);
                }
              }}
            />

            {/* Spending Cap Approval Section */}
            {needsApproval && (
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md space-y-3">
                <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                  ⚠️ Insufficient spending cap
                </p>
                <div className="space-y-2">
                  <Button
                    onClick={handleApproveSpendingCap}
                    disabled={isApproving}
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto border-amber-300 dark:border-amber-700"
                  >
                    {isApproving ? "Approving..." : "Increase Spending Cap"}
                  </Button>

                  {/* Expandable info section */}
                  <div className="text-xs text-amber-700 dark:text-amber-300">
                    <button
                      type="button"
                      onClick={() => setShowSpendingCapInfo(!showSpendingCapInfo)}
                      className="flex items-center gap-2 font-medium hover:text-amber-800 dark:hover:text-amber-200"
                    >
                      <Info className="h-4 w-4 flex-shrink-0" />
                      <span>What is the spending cap?</span>
                    </button>
                    {showSpendingCapInfo && (
                      <p className="mt-2 ml-6 leading-relaxed">
                        This authorizes the Gigentic Escrow contract to transfer{" "}
                        <strong>{(parseFloat(amount) * 1.05).toFixed(2)} cUSD</strong> from your
                        wallet to create the escrow. This is how ERC-20 tokens work - you must approve
                        the contract before it can move your tokens.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <input
              type="text"
              className="w-full px-4 py-2 border rounded-md"
              placeholder="Website Development"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              className="w-full px-4 py-2 border rounded-md min-h-[100px]"
              placeholder="Detailed description of the work to be completed..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {amount && (
            <div className="bg-muted p-4 rounded-md space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Escrow Amount:</span>
                <span className="font-medium">{amount} cUSD</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Platform Fee (1%):</span>
                <span>{(parseFloat(amount) * 0.01).toFixed(2)} cUSD</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Dispute Bond (4%):</span>
                <span>{(parseFloat(amount) * 0.04).toFixed(2)} cUSD</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Total Required:</span>
                <span>{(parseFloat(amount) * 1.05).toFixed(2)} cUSD</span>
              </div>
            </div>
          )}

          {(error || createError) && (
            <div className="bg-red-100 dark:bg-red-900 p-3 rounded-md">
              <p className="text-sm text-red-800 dark:text-red-100">
                {error || createError?.message}
              </p>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={isCreating || !!needsApproval}
            className="w-full"
            size="lg"
          >
            {isCreating ? "Creating..." : "Create Escrow"}
          </Button>

          {needsApproval && (
            <p className="text-sm text-amber-600 dark:text-amber-400 text-center -mt-2">
              Please increase spending cap first
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

