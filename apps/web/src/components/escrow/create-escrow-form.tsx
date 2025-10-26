"use client";

import { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { parseEther, type Address } from "viem";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ERC20_ABI,
  CUSD_ADDRESS,
  calculateTotalRequired,
} from "@/lib/escrow-config";
import { useRouter } from "next/navigation";
import { useCreateEscrow } from "@/hooks/use-create-escrow";

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
              type="number"
              step="0.01"
              min="0"
              className="w-full px-4 py-2 border rounded-md"
              placeholder="100.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
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
            disabled={isCreating}
            className="w-full"
            size="lg"
          >
            {isCreating ? "Creating..." : "Create Escrow"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

