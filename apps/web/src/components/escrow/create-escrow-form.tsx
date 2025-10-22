"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useReadContract, usePublicClient } from "wagmi";
import { parseEther, type Address, decodeEventLog } from "viem";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MASTER_FACTORY_ADDRESS,
  MASTER_FACTORY_ABI,
  ERC20_ABI,
  CUSD_ADDRESS,
  calculateTotalRequired,
} from "@/lib/escrow-config";
import { hashDocument } from "@/lib/hash";
import { useRouter } from "next/navigation";

/**
 * Create Escrow Form Component
 * Multi-step form for creating a new escrow
 */
export function CreateEscrowForm() {
  const router = useRouter();
  const { address: userAddress, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  // Form state
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Check cUSD balance and allowance
  const { data: balance } = useReadContract({
    address: CUSD_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CUSD_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: userAddress ? [userAddress, MASTER_FACTORY_ADDRESS] : undefined,
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

    setIsSubmitting(true);
    setError("");

    try {
      const amountWei = parseEther(amount);
      const { total } = calculateTotalRequired(amountWei);

      // Create deliverable document in memory (escrow address will be stored as KV key)
      const deliverable = {
        title,
        description,
        depositor: userAddress,
        recipient: recipient as Address,
        amount,
        createdAt: Date.now(),
      };

      // Generate hash from deliverable
      const deliverableHash = hashDocument(deliverable);

      // Step 1: Approve tokens if needed
      if (!allowance || allowance < total) {
        console.log("Approving cUSD spend...");
        const approveTxHash = await writeContractAsync({
          address: CUSD_ADDRESS,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [MASTER_FACTORY_ADDRESS, total],
        });

        console.log("Approval tx hash:", approveTxHash);
        console.log("Waiting for approval confirmation...");

        // Wait for approval transaction to be mined
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({
            hash: approveTxHash,
            confirmations: 1,
          });
          console.log("Approval confirmed!");
        }

        await refetchAllowance();
      }

      // Step 2: Create escrow (hash is written to blockchain here)
      console.log("Creating escrow...");
      const createTxHash = await writeContractAsync({
        address: MASTER_FACTORY_ADDRESS,
        abi: MASTER_FACTORY_ABI,
        functionName: "createEscrow",
        args: [recipient as Address, amountWei, deliverableHash],
      });

      console.log("Escrow tx hash:", createTxHash);
      console.log("Waiting for escrow creation confirmation...");

      // Wait for create escrow transaction to be mined and get the receipt
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: createTxHash,
          confirmations: 1,
        });
        console.log("Escrow created successfully!");

        // Extract escrow address from EscrowCreated event
        const escrowCreatedLog = receipt.logs.find((log) => {
          try {
            const decoded = decodeEventLog({
              abi: MASTER_FACTORY_ABI,
              data: log.data,
              topics: log.topics,
            });
            return decoded.eventName === "EscrowCreated";
          } catch {
            return false;
          }
        });

        if (escrowCreatedLog) {
          const decoded = decodeEventLog({
            abi: MASTER_FACTORY_ABI,
            data: escrowCreatedLog.data,
            topics: escrowCreatedLog.topics,
          });
          const escrowAddress = (decoded.args as any).escrowAddress as Address;
          console.log("Escrow address:", escrowAddress);

          // Step 3: Store deliverable document using escrow address as key
          const storeResponse = await fetch("/api/documents/store", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              hash: deliverableHash,
              document: deliverable,
              escrowAddress: escrowAddress,
            }),
          });

          if (storeResponse.ok) {
            console.log("Deliverable document stored with escrow address:", escrowAddress);
          } else {
            console.error("Failed to store deliverable document");
          }
        }
      }

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Error creating escrow:", err);
      setError(err.message || "Failed to create escrow");
    } finally {
      setIsSubmitting(false);
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

          {error && (
            <div className="bg-red-100 dark:bg-red-900 p-3 rounded-md">
              <p className="text-sm text-red-800 dark:text-red-100">{error}</p>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? "Creating..." : "Create Escrow"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

