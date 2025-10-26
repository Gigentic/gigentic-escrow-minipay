import type { Address } from "viem";

/**
 * Centralized TypeScript types for the escrow application
 *
 * This file contains all shared types used across components, hooks, and API routes.
 * Eliminates the need for `any` types and provides better IDE autocomplete.
 */

// ============================================================================
// Event Args Types (for type-safe blockchain event decoding)
// ============================================================================

/**
 * Arguments from the EscrowCreated event
 * Replaces: (decoded.args as any).escrowAddress
 */
export interface EscrowCreatedEventArgs {
  escrowAddress: Address;
  depositor: Address;
  recipient: Address;
  amount: bigint;
  deliverableHash: `0x${string}`;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Generic wrapper for document API responses
 */
export interface DocumentResponse<T> {
  document: T;
}

/**
 * Deliverable document stored in KV (keyed by escrow address)
 */
export interface DeliverableDocument {
  title: string;
  description: string;
  acceptanceCriteria: string[];
  depositor: Address;
  recipient: Address;
  amount: string;
  createdAt: number;
  category?: string;
}

/**
 * Dispute document stored in KV (keyed by dispute hash)
 */
export interface DisputeDocument {
  escrowAddress: Address;
  raiser: Address;
  reason: string;
  raisedAt: number;
}

/**
 * Resolution document stored in KV (keyed by resolution hash)
 */
export interface ResolutionDocument {
  escrowAddress: Address;
  arbiter: Address;
  favorDepositor: boolean;
  disputeReason: string;
  deliverableReview: string;
  evidenceConsidered: string[];
  decisionRationale: string;
  resolvedAt: number;
  transactionHash?: string;
}

// ============================================================================
// Mutation State Types (for loading state differentiation)
// ============================================================================

/**
 * Enum for different steps in mutation processes
 * Provides granular loading state feedback to users
 */
export enum MutationStep {
  IDLE = "idle",
  APPROVING = "approving", // Approving token spend
  CREATING = "creating", // Creating escrow transaction
  CONFIRMING = "confirming", // Waiting for transaction confirmation
  STORING = "storing", // Storing metadata to KV
  DISPUTING = "disputing", // Raising dispute
  COMPLETING = "completing", // Completing escrow
  RESOLVING = "resolving", // Resolving dispute (admin)
}

/**
 * State for mutations with granular step tracking
 * Replaces generic isLoading boolean
 */
export interface MutationState {
  step: MutationStep;
  isProcessing: boolean;
  error: string | null;
  txHash?: string; // For showing tx explorer links
  confirmations?: number; // For showing confirmation progress
}

// ============================================================================
// Hook Return Types
// ============================================================================

/**
 * Return type for escrow detail queries
 */
export interface EscrowDetailData {
  details: {
    depositor: Address;
    recipient: Address;
    escrowAmount: bigint;
    platformFee: bigint;
    disputeBond: bigint;
    state: number;
    deliverableHash: `0x${string}`; // Changed from string to hex string type
    createdAt: bigint;
  } | null;
  deliverable: DeliverableDocument | null;
  disputeInfo: {
    disputeReason: string; // Cleartext from KV
    disputeReasonHash: `0x${string}`; // Hash from contract (for reference)
    resolutionHash?: `0x${string}`; // Changed from string to hex string type
  } | null;
  resolution: ResolutionDocument | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Escrow list item for dashboard
 */
export interface EscrowListItem {
  address: Address;
  depositor: Address;
  recipient: Address;
  amount: bigint;
  state: number;
  createdAt: bigint;
  title?: string;
}

// ============================================================================
// Form Data Types
// ============================================================================

/**
 * Parameters for creating a new escrow
 */
export interface CreateEscrowParams {
  recipient: Address;
  amount: bigint;
  deliverable: {
    title: string;
    description: string;
    acceptanceCriteria: string[];
  };
}

/**
 * Parameters for raising a dispute
 */
export interface DisputeParams {
  escrowAddress: Address;
  reason: string;
}

/**
 * Parameters for resolving a dispute (admin)
 */
export interface ResolveDisputeParams {
  escrowAddress: Address;
  favorDepositor: boolean;
  disputeReason: string;
  deliverableReview: string;
  evidenceConsidered: string[];
  decisionRationale: string;
}
