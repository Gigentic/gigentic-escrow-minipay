"use client";

import { useAccount, useReadContract } from "wagmi";
import { formatEther } from "viem";
import { celoSepolia } from "viem/chains";
import { Address } from "@composer-kit/ui/address";
import {
  Transaction,
  TransactionButton,
  TransactionStatus,
} from "@composer-kit/ui/transaction";
import { Card } from "@/components/ui/card";
import {
  SIMPLE_ESCROW_ABI,
  ESCROW_CONTRACT_ADDRESS,
  EscrowInfo,
} from "@/lib/escrow-config";
import { useState } from "react";

export function EscrowInteraction() {
  const [txHash, setTxHash] = useState<string>("");
  const { address: connectedAddress, isConnected } = useAccount();

  // Read escrow info - disable query during SSR to prevent hydration mismatch
  const { data: escrowInfo, refetch } = useReadContract({
    address: ESCROW_CONTRACT_ADDRESS,
    abi: SIMPLE_ESCROW_ABI,
    functionName: "escrowInfo",
    chainId: celoSepolia.id,
    query: {
      enabled: typeof window !== 'undefined', // Only run on client
    },
  });

  // Parse escrow info
  const parsedInfo: EscrowInfo | null = escrowInfo
    ? {
        depositor: escrowInfo[0],
        recipient: escrowInfo[1],
        amount: escrowInfo[2],
        isDeposited: escrowInfo[3],
        isReleased: escrowInfo[4],
      }
    : null;

  // Check if connected user is the depositor
  const isDepositor =
    isConnected &&
    connectedAddress &&
    parsedInfo &&
    connectedAddress.toLowerCase() === parsedInfo.depositor.toLowerCase();

  // Check if release is available
  const canRelease =
    isDepositor && parsedInfo?.isDeposited && !parsedInfo?.isReleased;

  return (
    <div className="container mx-auto px-4 max-w-4xl py-12">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Simple Escrow</h1>
        <p className="text-muted-foreground">
          View and interact with the deployed escrow contract
        </p>
      </div>

      <Card className="p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">Escrow Information</h2>

        {!parsedInfo ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading escrow information...
          </div>
        ) : (
          <div className="space-y-4">
            {/* Contract Address */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-foreground">
                Contract Address
              </label>
              <Address
                address={ESCROW_CONTRACT_ADDRESS}
                className="bg-secondary p-3 rounded-md font-mono text-sm"
                copyOnClick
              />
            </div>

            {/* Depositor */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-foreground">
                Depositor
              </label>
              <Address
                address={parsedInfo.depositor}
                className="bg-secondary p-3 rounded-md font-mono text-sm"
                copyOnClick
              />
            </div>

            {/* Recipient */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-foreground">
                Recipient
              </label>
              <Address
                address={parsedInfo.recipient}
                className="bg-secondary p-3 rounded-md font-mono text-sm"
                copyOnClick
              />
            </div>

            {/* Amount */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-foreground">
                Amount Locked
              </label>
              <div className="bg-secondary p-3 rounded-md font-semibold text-lg">
                {formatEther(parsedInfo.amount)} CELO
              </div>
            </div>

            {/* Status */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-foreground">
                Status
              </label>
              <div className="flex gap-4">
                <div
                  className={`px-3 py-2 rounded-md font-medium text-sm ${
                    parsedInfo.isDeposited
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
                  }`}
                >
                  {parsedInfo.isDeposited ? "✓ Deposited" : "Not Deposited"}
                </div>
                <div
                  className={`px-3 py-2 rounded-md font-medium text-sm ${
                    parsedInfo.isReleased
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
                  }`}
                >
                  {parsedInfo.isReleased ? "✓ Released" : "Not Released"}
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Release Section */}
      <Card className="p-6">
        <h2 className="text-2xl font-semibold mb-4">Release Funds</h2>

        {!isConnected ? (
          <div className="text-center py-8 text-muted-foreground">
            Please connect your wallet to interact with the escrow
          </div>
        ) : !isDepositor ? (
          <div className="text-center py-8 text-muted-foreground">
            Only the depositor can release the funds
          </div>
        ) : parsedInfo?.isReleased ? (
          <div className="text-center py-8 text-muted-foreground">
            Funds have already been released
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              You are the depositor. You can release the funds to the recipient.
            </p>

            <Transaction
              chainId={celoSepolia.id}
              onSuccess={(result: any) => {
                console.log("Release successful:", result);
                setTxHash(result);
                // Refetch escrow info after successful release
                setTimeout(() => refetch(), 2000);
              }}
              onError={(error: any) => {
                console.error("Release failed:", error);
              }}
              transaction={{
                abi: SIMPLE_ESCROW_ABI,
                address: ESCROW_CONTRACT_ADDRESS,
                functionName: "release",
              }}
            >
              <TransactionButton
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-6 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!canRelease}
              >
                {canRelease ? "Release Funds" : "Cannot Release"}
              </TransactionButton>
              <TransactionStatus className="mt-4" />
            </Transaction>

            {txHash && (
              <div className="mt-4 p-3 bg-green-100 dark:bg-green-900 rounded-md">
                <p className="text-sm font-medium text-green-800 dark:text-green-100">
                  Transaction successful!
                </p>
                <p className="text-xs text-green-700 dark:text-green-200 mt-1 break-all">
                  Hash: {txHash}
                </p>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

