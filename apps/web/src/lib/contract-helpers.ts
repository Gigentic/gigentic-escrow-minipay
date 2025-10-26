import { decodeEventLog } from "viem";
import type { Address, TransactionReceipt } from "viem";
import { MASTER_FACTORY_ABI } from "@/lib/escrow-config";
import type { EscrowCreatedEventArgs } from "@/lib/types";

/**
 * Type-safe helper functions for extracting data from blockchain events
 *
 * This file eliminates all `(decoded.args as any)` patterns found in:
 * - create-escrow-form.tsx (line 228)
 * - Any other contract interaction code
 *
 * Benefits:
 * - Type-safe event argument access
 * - Single source of truth for event extraction
 * - Better error messages from TypeScript
 */

/**
 * Extract escrow address from EscrowCreated event in transaction receipt
 *
 * Replaces: const escrowAddress = (decoded.args as any).escrowAddress as Address;
 * With: const escrowAddress = extractEscrowCreatedAddress(receipt);
 *
 * @param receipt - Transaction receipt from escrow creation
 * @returns Escrow address or null if event not found
 */
export function extractEscrowCreatedAddress(
  receipt: TransactionReceipt
): Address | null {
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

  if (!escrowCreatedLog) {
    console.error("EscrowCreated event not found in transaction receipt");
    return null;
  }

  try {
    const decoded = decodeEventLog({
      abi: MASTER_FACTORY_ABI,
      data: escrowCreatedLog.data,
      topics: escrowCreatedLog.topics,
    });

    // Type-safe access to event args
    const args = decoded.args as EscrowCreatedEventArgs;
    return args.escrowAddress;
  } catch (error) {
    console.error("Failed to decode EscrowCreated event:", error);
    return null;
  }
}

/**
 * Extract full event data from EscrowCreated event
 *
 * @param receipt - Transaction receipt from escrow creation
 * @returns Complete event args or null if event not found
 */
export function extractEscrowCreatedEvent(
  receipt: TransactionReceipt
): EscrowCreatedEventArgs | null {
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

  if (!escrowCreatedLog) {
    return null;
  }

  try {
    const decoded = decodeEventLog({
      abi: MASTER_FACTORY_ABI,
      data: escrowCreatedLog.data,
      topics: escrowCreatedLog.topics,
    });

    return decoded.args as EscrowCreatedEventArgs;
  } catch (error) {
    console.error("Failed to decode EscrowCreated event:", error);
    return null;
  }
}
