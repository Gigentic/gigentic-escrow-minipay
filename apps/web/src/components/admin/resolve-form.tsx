"use client";

import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { type Address } from "viem";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ESCROW_CONTRACT_ABI } from "@/lib/escrow-config";
import { useRouter } from "next/navigation";

interface ResolveFormProps {
  escrowAddress: Address;
  disputeReason: string;
  deliverableTitle?: string;
  deliverableDescription?: string;
  acceptanceCriteria?: string[];
}

/**
 * Resolve Form Component
 * Interface for admin to resolve disputes
 */
export function ResolveForm({
  escrowAddress,
  disputeReason,
  deliverableTitle,
  deliverableDescription,
  acceptanceCriteria = [],
}: ResolveFormProps) {
  const router = useRouter();
  const { address: adminAddress } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [favorDepositor, setFavorDepositor] = useState<boolean | null>(null);
  const [deliverableReview, setDeliverableReview] = useState("");
  const [evidenceConsidered, setEvidenceConsidered] = useState<string[]>([""]);
  const [decisionRationale, setDecisionRationale] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const addEvidence = () => {
    setEvidenceConsidered([...evidenceConsidered, ""]);
  };

  const updateEvidence = (index: number, value: string) => {
    const newEvidence = [...evidenceConsidered];
    newEvidence[index] = value;
    setEvidenceConsidered(newEvidence);
  };

  const removeEvidence = (index: number) => {
    if (evidenceConsidered.length > 1) {
      setEvidenceConsidered(evidenceConsidered.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async () => {
    if (favorDepositor === null) {
      setError("Please select who to favor in the resolution");
      return;
    }

    if (!deliverableReview || !decisionRationale) {
      setError("Please complete all required fields");
      return;
    }

    if (!adminAddress) {
      setError("Admin wallet not connected");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // Step 1: Store resolution document
      const resolutionResponse = await fetch("/api/admin/resolve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": adminAddress,
        },
        body: JSON.stringify({
          escrowAddress,
          favorDepositor,
          disputeReason,
          deliverableReview,
          evidenceConsidered: evidenceConsidered.filter((e) => e.trim() !== ""),
          decisionRationale,
        }),
      });

      if (!resolutionResponse.ok) {
        throw new Error("Failed to store resolution document");
      }

      const { resolutionHash } = await resolutionResponse.json();

      // Step 2: Call resolve on-chain
      const tx = await writeContractAsync({
        address: escrowAddress,
        abi: ESCROW_CONTRACT_ABI,
        functionName: "resolve",
        args: [favorDepositor, resolutionHash],
      });

      console.log("Resolution tx:", tx);

      // Redirect back to disputes list
      router.push("/admin/disputes");
    } catch (err: any) {
      console.error("Error resolving dispute:", err);
      setError(err.message || "Failed to resolve dispute");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-semibold mb-6">Resolve Dispute</h2>

      <div className="space-y-6">
        {/* Decision Selection */}
        <div>
          <label className="block text-sm font-medium mb-3">Resolution Decision *</label>
          <div className="flex gap-4">
            <Button
              variant={favorDepositor === true ? "default" : "outline"}
              onClick={() => setFavorDepositor(true)}
              className="flex-1"
            >
              Favor Depositor (Refund)
            </Button>
            <Button
              variant={favorDepositor === false ? "default" : "outline"}
              onClick={() => setFavorDepositor(false)}
              className="flex-1"
            >
              Favor Recipient (Complete)
            </Button>
          </div>
        </div>

        {/* Original Dispute Info */}
        <div className="bg-muted p-4 rounded-md">
          <p className="text-sm font-medium mb-2">Original Dispute Reason:</p>
          <p className="text-sm text-muted-foreground">{disputeReason}</p>
        </div>

        {/* Deliverable Info (if available) */}
        {deliverableTitle && (
          <div className="bg-muted p-4 rounded-md">
            <p className="text-sm font-medium mb-2">Deliverable:</p>
            <p className="text-sm font-semibold mb-1">{deliverableTitle}</p>
            {deliverableDescription && (
              <p className="text-sm text-muted-foreground mb-2">{deliverableDescription}</p>
            )}
            {acceptanceCriteria.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium mb-1">Acceptance Criteria:</p>
                <ul className="list-disc list-inside space-y-1">
                  {acceptanceCriteria.map((criteria, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      {criteria}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Deliverable Review */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Deliverable Review *
          </label>
          <textarea
            className="w-full px-4 py-2 border rounded-md min-h-[100px]"
            placeholder="Assess whether the deliverable meets the acceptance criteria..."
            value={deliverableReview}
            onChange={(e) => setDeliverableReview(e.target.value)}
          />
        </div>

        {/* Evidence Considered
        <div>
          <label className="block text-sm font-medium mb-2">
            Evidence Considered
          </label>
          {evidenceConsidered.map((evidence, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                type="text"
                className="flex-1 px-4 py-2 border rounded-md"
                placeholder={`Evidence ${index + 1} (e.g., "GitHub repository", "Screenshots")`}
                value={evidence}
                onChange={(e) => updateEvidence(index, e.target.value)}
              />
              {evidenceConsidered.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => removeEvidence(index)}
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addEvidence} className="mt-2">
            Add Evidence
          </Button>
        </div> */}

        {/* Decision Rationale */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Decision Rationale *
          </label>
          <textarea
            className="w-full px-4 py-2 border rounded-md min-h-[150px]"
            placeholder="Explain the reasoning behind your decision in detail..."
            value={decisionRationale}
            onChange={(e) => setDecisionRationale(e.target.value)}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900 p-3 rounded-md">
            <p className="text-sm text-red-800 dark:text-red-100">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || favorDepositor === null}
            className="flex-1"
            size="lg"
          >
            {isSubmitting ? "Resolving..." : "Submit Resolution"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

