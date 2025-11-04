import { Redis } from "@upstash/redis";

/**
 * Upstash KV Client Singleton
 * Used for storing deliverable documents, resolution documents, and optional user metadata
 */

// Initialize Redis client with environment variables
let kvClient: Redis | null = null;

export function getKVClient(): Redis {
  if (!kvClient) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error(
        "Missing Upstash credentials. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in your environment variables."
      );
    }

    kvClient = new Redis({
      url,
      token,
    });
  }

  return kvClient;
}

// Helper to map chainId to chain name for KV keys
function getChainName(chainId: number): string {
  const chainMap: Record<number, string> = {
    11142220: "celoSepolia",
    42220: "celo",
    31337: "hardhat",
  };
  return chainMap[chainId] || "unknown";
}

// Helper functions for key generation (no environment prefix)
export const kvKeys = {
  deliverable: (chainId: number, escrowAddress: string) =>
    `${getChainName(chainId)}:deliverable:${escrowAddress.toLowerCase()}`,

  resolution: (chainId: number, hash: string) =>
    `${getChainName(chainId)}:resolution:${hash}`,

  dispute: (chainId: number, hash: string) =>
    `${getChainName(chainId)}:dispute:${hash}`,

  // Profile is global across all chains
  profile: (address: string) =>
    `profile:${address.toLowerCase()}`,
};

// User Profile Types
export interface UserProfile {
  name: string;
  bio: string;
  updatedAt: number;
  isVerified?: boolean;
  verifiedAt?: number;
}

// Profile Helper Functions
export async function getProfile(address: string): Promise<UserProfile | null> {
  const kv = getKVClient();
  const key = kvKeys.profile(address);
  const profile = await kv.get<UserProfile>(key);
  return profile;
}

export async function setProfile(address: string, profile: Omit<UserProfile, 'updatedAt'>): Promise<UserProfile> {
  const kv = getKVClient();
  const key = kvKeys.profile(address);
  const data: UserProfile = {
    ...profile,
    updatedAt: Date.now(),
  };
  await kv.set(key, data);
  return data; // Return the saved profile to avoid unnecessary refetch
}

export async function deleteProfile(address: string): Promise<void> {
  const kv = getKVClient();
  const key = kvKeys.profile(address);
  await kv.del(key);
}

