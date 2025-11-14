import { formatUnits } from "viem";
import { getStablecoinDecimals, getStablecoinSymbol } from "./escrow-config";

/**
 * Format a bigint amount as a human-readable string with the correct currency symbol
 * Supports both Celo (18 decimals, cUSD) and Arc (6 decimals, USDC)
 * @param amount Amount in smallest unit (bigint)
 * @param chainId Optional chain ID to determine decimals and symbol (defaults to Celo)
 * @returns Formatted string like "100.00 cUSD" or "100.00 USDC"
 */
export function formatAmount(amount: bigint, chainId?: number): string {
  const decimals = chainId ? getStablecoinDecimals(chainId) : 18;
  const symbol = chainId ? getStablecoinSymbol(chainId) : 'cUSD';
  return `${formatUnits(amount, decimals)} ${symbol}`;
}

/**
 * Format a Unix timestamp (in seconds) as a localized date string
 * @param timestamp Unix timestamp in seconds (bigint or number)
 * @returns Localized date/time string
 */
export function formatDate(timestamp: bigint | number): string {
  return new Date(Number(timestamp) * 1000).toLocaleString();
}
