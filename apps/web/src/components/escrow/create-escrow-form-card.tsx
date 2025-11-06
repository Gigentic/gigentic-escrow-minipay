"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check } from "lucide-react";

interface CreateEscrowFormCardProps {
  recipient: string;
  setRecipient: (value: string) => void;
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  amount: string;
  setAmount: (value: string) => void;
  balance?: bigint;
  totalRequired: bigint;
  error: string | null;
  createError?: { message: string } | null;
  onReviewClick: () => void;
}

/**
 * Create Escrow Form Card Component
 * Displays the form fields for creating a new escrow
 */
export function CreateEscrowFormCard({
  recipient,
  setRecipient,
  title,
  setTitle,
  description,
  setDescription,
  amount,
  setAmount,
  balance,
  totalRequired,
  error,
  createError,
  onReviewClick,
}: CreateEscrowFormCardProps) {
  return (
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
              let value = e.target.value;
              // Replace comma with period for iOS locale compatibility
              value = value.replace(',', '.');
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
          onClick={onReviewClick}
          className="w-full"
          size="lg"
        >
          Review & Create Escrow
        </Button>
      </div>
    </Card>
  );
}
