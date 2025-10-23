import { Address } from "viem";

// MasterFactory ABI - extracted from compiled contracts
export const MASTER_FACTORY_ABI = [
  {
    inputs: [{ internalType: "address", name: "_cUSDAddress", type: "address" }],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "address", name: "oldArbiter", type: "address" },
      { indexed: false, internalType: "address", name: "newArbiter", type: "address" },
    ],
    name: "ArbiterUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "escrowAddress", type: "address" },
      { indexed: true, internalType: "address", name: "depositor", type: "address" },
      { indexed: true, internalType: "address", name: "recipient", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
      { indexed: false, internalType: "bytes32", name: "deliverableHash", type: "bytes32" },
    ],
    name: "EscrowCreated",
    type: "event",
  },
  {
    inputs: [],
    name: "admin",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "allEscrows",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "arbiter",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "cUSDAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_recipient", type: "address" },
      { internalType: "uint256", name: "_amount", type: "uint256" },
      { internalType: "bytes32", name: "_deliverableHash", type: "bytes32" },
    ],
    name: "createEscrow",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getAllEscrows",
    outputs: [{ internalType: "address[]", name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getStatistics",
    outputs: [
      { internalType: "uint256", name: "escrowsCreated", type: "uint256" },
      { internalType: "uint256", name: "volumeProcessed", type: "uint256" },
      { internalType: "uint256", name: "feesCollected", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getUserEscrows",
    outputs: [{ internalType: "address[]", name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "isValidEscrow",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "feeAmount", type: "uint256" }],
    name: "reportFeeCollection",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "totalEscrowsCreated",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalFeesCollected",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalVolumeProcessed",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_newArbiter", type: "address" }],
    name: "updateArbiter",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "", type: "address" },
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    name: "userEscrows",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// EscrowContract ABI - extracted from compiled contracts
export const ESCROW_CONTRACT_ABI = [
  {
    inputs: [
      { internalType: "address", name: "_depositor", type: "address" },
      { internalType: "address", name: "_recipient", type: "address" },
      { internalType: "uint256", name: "_amount", type: "uint256" },
      { internalType: "bytes32", name: "_deliverableHash", type: "bytes32" },
      { internalType: "address", name: "_arbiter", type: "address" },
      { internalType: "address", name: "_tokenAddress", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "recipient", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "EscrowCompleted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "fee", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "bond", type: "uint256" },
    ],
    name: "EscrowFunded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "depositor", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "EscrowRefunded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "raiser", type: "address" },
      { indexed: false, internalType: "string", name: "reason", type: "string" },
    ],
    name: "DisputeRaised",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "bool", name: "favorDepositor", type: "bool" },
      { indexed: false, internalType: "bytes32", name: "resolutionHash", type: "bytes32" },
      { indexed: false, internalType: "uint256", name: "payoutAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "feeAmount", type: "uint256" },
    ],
    name: "DisputeResolved",
    type: "event",
  },
  {
    inputs: [],
    name: "DISPUTE_BOND_BPS",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "PLATFORM_FEE_BPS",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "arbiter",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "complete",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "createdAt",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "deliverableHash",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "depositor",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "string", name: "reason", type: "string" }],
    name: "dispute",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "disputeBond",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "disputeReason",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "escrowAmount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "factory",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getContractBalance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getDetails",
    outputs: [
      { internalType: "address", name: "_depositor", type: "address" },
      { internalType: "address", name: "_recipient", type: "address" },
      { internalType: "uint256", name: "_escrowAmount", type: "uint256" },
      { internalType: "uint256", name: "_platformFee", type: "uint256" },
      { internalType: "uint256", name: "_disputeBond", type: "uint256" },
      { internalType: "enum EscrowContract.EscrowState", name: "_state", type: "uint8" },
      { internalType: "bytes32", name: "_deliverableHash", type: "bytes32" },
      { internalType: "uint256", name: "_createdAt", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getDisputeInfo",
    outputs: [
      { internalType: "string", name: "_disputeReason", type: "string" },
      { internalType: "bytes32", name: "_resolutionHash", type: "bytes32" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getTotalValue",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "platformFee",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "recipient",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bool", name: "favorDepositor", type: "bool" },
      { internalType: "bytes32", name: "_resolutionHash", type: "bytes32" },
    ],
    name: "resolve",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "resolutionHash",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "state",
    outputs: [{ internalType: "enum EscrowContract.EscrowState", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "token",
    outputs: [{ internalType: "contract IERC20", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalDeposited",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ERC20 ABI (minimal - for cUSD token interactions)
export const ERC20_ABI = [
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Contract addresses from environment variables
export const MASTER_FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_MASTER_FACTORY_ADDRESS! as Address);
export const CUSD_ADDRESS = (process.env.NEXT_PUBLIC_CUSD_ADDRESS! as Address);
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID!);

// TypeScript interfaces for contract data structures

export enum EscrowState {
  CREATED = 0,
  DISPUTED = 1,
  COMPLETED = 2,
  REFUNDED = 3,
}

export interface EscrowDetails {
  depositor: Address;
  recipient: Address;
  escrowAmount: bigint;
  platformFee: bigint;
  disputeBond: bigint;
  state: EscrowState;
  deliverableHash: `0x${string}`;
  createdAt: bigint;
}

export interface DisputeInfo {
  disputeReason: string;
  resolutionHash: `0x${string}`;
}

export interface FactoryStatistics {
  escrowsCreated: bigint;
  volumeProcessed: bigint;
  feesCollected: bigint;
}

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

export interface ResolutionDocument {
  escrowAddress: Address;
  arbiter: Address;
  favorDepositor: boolean;
  disputeReason: string;
  deliverableReview: string;
  evidenceConsidered: string[];
  decisionRationale: string;
  resolvedAt: number;
  transactionHash: string;
}

export interface DisputeDocument {
  escrowAddress: Address;
  raiser: Address;
  reason: string;
  raisedAt: number;
}

export interface UserMetadata {
  displayName?: string;
  bio?: string;
  escrowCount: number;
  lastActive: number;
}

// Helper function to calculate total required for escrow
export function calculateTotalRequired(amount: bigint): {
  amount: bigint;
  platformFee: bigint;
  disputeBond: bigint;
  total: bigint;
} {
  const platformFee = (amount * 100n) / 10000n; // 1%
  const disputeBond = (amount * 400n) / 10000n; // 4%
  const total = amount + platformFee + disputeBond;
  
  return {
    amount,
    platformFee,
    disputeBond,
    total,
  };
}

// Helper function to format escrow state as string
export function formatEscrowState(state: EscrowState): string {
  switch (state) {
    case EscrowState.CREATED:
      return "Created";
    case EscrowState.DISPUTED:
      return "Disputed";
    case EscrowState.COMPLETED:
      return "Completed";
    case EscrowState.REFUNDED:
      return "Refunded";
    default:
      return "Unknown";
  }
}
