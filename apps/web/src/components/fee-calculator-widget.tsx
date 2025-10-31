"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { calculateTotalRequired } from "@/lib/escrow-config";
import { formatUnits, parseUnits } from "viem";

export function FeeCalculatorWidget() {
  const router = useRouter();
  const [amount, setAmount] = useState("");

  const handleAmountChange = (value: string) => {
    // Allow only numbers and decimal point
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  const handleQuickAmount = (quickAmount: number) => {
    setAmount(quickAmount.toString());
  };

  const calculateFees = () => {
    if (!amount || parseFloat(amount) <= 0) {
      return null;
    }

    try {
      const amountInWei = parseUnits(amount, 18);
      const fees = calculateTotalRequired(amountInWei);

      return {
        amount: formatUnits(fees.amount, 18),
        platformFee: formatUnits(fees.platformFee, 18),
        disputeBond: formatUnits(fees.disputeBond, 18),
        total: formatUnits(fees.total, 18),
      };
    } catch (error) {
      return null;
    }
  };

  const fees = calculateFees();

  const handleCreateEscrow = () => {
    if (amount && parseFloat(amount) > 0) {
      router.push(`/create?amount=${amount}`);
    }
  };

  return (
    <Card className="p-6 w-full max-w-md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {/* Top row: Empty space and Quick amount buttons */}
          <div></div>
          <div className="flex gap-0 justify-end pr-10">
            {[1, 10, 50, 100].map((quickAmount) => (
              <Button
                key={quickAmount}
                variant="ghost"
                size="sm"
                onClick={() => handleQuickAmount(quickAmount)}
                className="h-7 px-2 text-xs"
              >
                {quickAmount}
              </Button>
            ))}
          </div>

          {/* Bottom row: Amount label, input with cUSD */}
          <div className="flex items-center justify-start">
            <label htmlFor="amount" className="text-sm font-medium whitespace-nowrap">
              Amount:
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Input
              id="amount"
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="flex-1 text-right"
            />
            <span className="text-sm font-medium">cUSD</span>
          </div>
        </div>

        {fees && (
          <div className="space-y-2 pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Recipient receives:</span>
              <span className="font-medium">{parseFloat(fees.amount).toFixed(2)} cUSD</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Platform fee (1%):</span>
              <span className="font-medium">{parseFloat(fees.platformFee).toFixed(2)} cUSD</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Refundable bond (4%):</span>
              <span className="font-medium">{parseFloat(fees.disputeBond).toFixed(2)} cUSD</span>
            </div>
            <div className="flex justify-between text-base font-semibold pt-2 border-t">
              <span>Total you pay:</span>
              <span className="text-primary">{parseFloat(fees.total).toFixed(2)} cUSD</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">You get back (when no disputes):</span>
              <span className="font-medium">{parseFloat(fees.disputeBond).toFixed(2)} cUSD</span>
            </div>
          </div>
        )}

        <Button
          onClick={handleCreateEscrow}
          disabled={!amount || parseFloat(amount) <= 0}
          className="w-full"
        >
          Create This Escrow →
        </Button>
      </div>
    </Card>
  );
}
