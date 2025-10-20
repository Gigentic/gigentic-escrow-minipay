"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useReadContract, usePublicClient } from "wagmi";
import { parseEther, type Address } from "viem";
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
  const [step, setStep] = useState(1);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [criteria, setCriteria] = useState<string[]>([""]);
  const [category, setCategory] = useState("");
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

  // Helper functions
  const addCriteria = () => {
    setCriteria([...criteria, ""]);
  };

  const updateCriteria = (index: number, value: string) => {
    const newCriteria = [...criteria];
    newCriteria[index] = value;
    setCriteria(newCriteria);
  };

  const removeCriteria = (index: number) => {
    if (criteria.length > 1) {
      setCriteria(criteria.filter((_, i) => i !== index));
    }
  };

  const validateStep1 = (): boolean => {
    if (!recipient || !amount) {
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

  const validateStep2 = (): boolean => {
    if (!title || !description) {
      setError("Please fill in title and description");
      return false;
    }

    const validCriteria = criteria.filter((c) => c.trim() !== "");
    if (validCriteria.length === 0) {
      setError("Please add at least one acceptance criterion");
      return false;
    }

    setError("");
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;
    if (!userAddress || !isConnected) {
      setError("Please connect your wallet");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const amountWei = parseEther(amount);
      const { total } = calculateTotalRequired(amountWei);

      // Create deliverable document
      const deliverable = {
        title,
        description,
        acceptanceCriteria: criteria.filter((c) => c.trim() !== ""),
        escrowAddress: "0x0000000000000000000000000000000000000000" as Address, // Will be updated after creation
        depositor: userAddress,
        recipient: recipient as Address,
        amount,
        createdAt: Date.now(),
        category: category || undefined,
      };

      // Generate hash
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

      // Step 2: Store deliverable document
      const storeResponse = await fetch("/api/documents/store", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hash: deliverableHash,
          document: deliverable,
        }),
      });

      if (!storeResponse.ok) {
        throw new Error("Failed to store deliverable document");
      }

      // Step 3: Create escrow
      console.log("Creating escrow...");
      const createTxHash = await writeContractAsync({
        address: MASTER_FACTORY_ADDRESS,
        abi: MASTER_FACTORY_ABI,
        functionName: "createEscrow",
        args: [recipient as Address, amountWei, deliverableHash],
      });

      console.log("Escrow tx hash:", createTxHash);
      console.log("Waiting for escrow creation confirmation...");

      // Wait for create escrow transaction to be mined
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({
          hash: createTxHash,
          confirmations: 1,
        });
        console.log("Escrow created successfully!");
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

  const amountWei = amount ? parseEther(amount) : 0n;
  const costs = calculateTotalRequired(amountWei);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className={`flex items-center ${step >= 1 ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}>
              1
            </div>
            <span className="ml-2 hidden sm:inline">Details</span>
          </div>
          <div className="flex-1 h-0.5 mx-4 bg-muted">
            <div className={`h-full ${step >= 2 ? "bg-primary" : ""} transition-all`} />
          </div>
          <div className={`flex items-center ${step >= 2 ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}>
              2
            </div>
            <span className="ml-2 hidden sm:inline">Deliverable</span>
          </div>
        </div>
      </div>

      <Card className="p-6">
        {/* Step 1: Basic Details */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Escrow Details</h2>
              <p className="text-muted-foreground">Enter the recipient and amount</p>
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

            <Button onClick={handleNext} className="w-full" size="lg">
              Next
            </Button>
          </div>
        )}

        {/* Step 2: Deliverable Details */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Deliverable Details</h2>
              <p className="text-muted-foreground">Describe what the recipient will deliver</p>
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
              <label className="block text-sm font-medium mb-2">Category (optional)</label>
              <input
                type="text"
                className="w-full px-4 py-2 border rounded-md"
                placeholder="Development, Design, Writing, etc."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
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

            <div>
              <label className="block text-sm font-medium mb-2">Acceptance Criteria</label>
              {criteria.map((criterion, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    className="flex-1 px-4 py-2 border rounded-md"
                    placeholder={`Criterion ${index + 1}`}
                    value={criterion}
                    onChange={(e) => updateCriteria(index, e.target.value)}
                  />
                  {criteria.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => removeCriteria(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addCriteria} className="mt-2">
                Add Criterion
              </Button>
            </div>

            {error && (
              <div className="bg-red-100 dark:bg-red-900 p-3 rounded-md">
                <p className="text-sm text-red-800 dark:text-red-100">{error}</p>
              </div>
            )}

            <div className="flex gap-4">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1"
                size="lg"
              >
                {isSubmitting ? "Creating..." : "Create Escrow"}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

