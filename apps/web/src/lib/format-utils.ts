import { formatEther } from "viem";

/**
 * Format a bigint amount as a human-readable string with cUSD currency
 * @param amount Amount in wei (bigint)
 * @returns Formatted string like "100.00 cUSD"
 */
export function formatAmount(amount: bigint): string {
  return `${formatEther(amount)} cUSD`;
}

/**
 * Format a Unix timestamp (in seconds) as a localized date string
 * @param timestamp Unix timestamp in seconds (bigint or number)
 * @returns Localized date/time string
 */
export function formatDate(timestamp: bigint | number): string {
  return new Date(Number(timestamp) * 1000).toLocaleString();
}
