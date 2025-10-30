"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { calculateTotalRequired } from "@/lib/escrow-config";
import { formatUnits, parseUnits } from "viem";
import { Calculator } from "lucide-react";

export function FeeCalculatorWidget() {
  const router = useRouter();
  const [amount, setAmount] = useState("");

  const handleAmountChange = (value: string) => {
    // Allow only numbers and decimal point
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
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
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Fee Calculator</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="amount"
            className="block text-sm font-medium mb-2"
          >
            Escrow Amount (cUSD)
          </label>
          <Input
            id="amount"
            type="text"
            inputMode="decimal"
            placeholder="100"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
          />
        </div>

        {fees && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Escrow Amount:</span>
              <span className="font-medium">{parseFloat(fees.amount).toFixed(2)} cUSD</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Platform Fee (1%):</span>
              <span className="font-medium">{parseFloat(fees.platformFee).toFixed(2)} cUSD</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Dispute Bond (4%):</span>
              <span className="font-medium">{parseFloat(fees.disputeBond).toFixed(2)} cUSD</span>
            </div>
            <div className="flex justify-between text-base font-semibold pt-2 border-t">
              <span>Total Required:</span>
              <span className="text-primary">{parseFloat(fees.total).toFixed(2)} cUSD</span>
            </div>
          </div>
        )}

        <Button
          onClick={handleCreateEscrow}
          disabled={!amount || parseFloat(amount) <= 0}
          className="w-full"
        >
          Create This Escrow
        </Button>
      </div>
    </Card>
  );
}
