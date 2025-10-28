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

// Get environment and chain from environment variables
const APP_ENV = process.env.NEXT_PUBLIC_APP_ENV;
const CHAIN = process.env.NEXT_PUBLIC_CHAIN;

if (!APP_ENV) {
  throw new Error("NEXT_PUBLIC_APP_ENV is not defined. Please set it in your environment variables.");
}

if (!CHAIN) {
  throw new Error("NEXT_PUBLIC_CHAIN is not defined. Please set it in your environment variables.");
}

// Create namespace prefix
const NAMESPACE = `${APP_ENV}:${CHAIN}:`;

// Key prefixes for different data types
export const KV_PREFIXES = {
  DELIVERABLE: `${NAMESPACE}deliverable:`,
  RESOLUTION: `${NAMESPACE}resolution:`,
  DISPUTE: `${NAMESPACE}dispute:`,
  USER: `${NAMESPACE}user:`,
} as const;

// Helper functions for key generation
export const kvKeys = {
  deliverable: (escrowAddress: string) => `${KV_PREFIXES.DELIVERABLE}${escrowAddress.toLowerCase()}`,
  resolution: (hash: string) => `${KV_PREFIXES.RESOLUTION}${hash}`,
  dispute: (hash: string) => `${KV_PREFIXES.DISPUTE}${hash}`,
  user: (address: string) => `${KV_PREFIXES.USER}${address.toLowerCase()}`,
  profile: (address: string) => `${NAMESPACE}profile:${address.toLowerCase()}`,
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

export async function setProfile(address: string, profile: Omit<UserProfile, 'updatedAt'>): Promise<void> {
  const kv = getKVClient();
  const key = kvKeys.profile(address);
  const data: UserProfile = {
    ...profile,
    updatedAt: Date.now(),
  };
  await kv.set(key, data);
}

export async function deleteProfile(address: string): Promise<void> {
  const kv = getKVClient();
  const key = kvKeys.profile(address);
  await kv.del(key);
}

