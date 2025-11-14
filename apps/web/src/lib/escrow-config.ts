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
      { indexed: false, internalType: "bytes32", name: "disputeReasonHash", type: "bytes32" },
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
    inputs: [{ internalType: "bytes32", name: "_disputeReasonHash", type: "bytes32" }],
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
    name: "disputeReasonHash",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
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
      { internalType: "bytes32", name: "_disputeReasonHash", type: "bytes32" },
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

// Contract address mapping functions
export function getMasterFactoryAddress(chainId: number): Address {
  const addresses: Record<number, Address> = {
    11142220: process.env.NEXT_PUBLIC_MASTER_FACTORY_ADDRESS_SEPOLIA! as Address,
    42220: process.env.NEXT_PUBLIC_MASTER_FACTORY_ADDRESS_CELO! as Address,
    5042002: process.env.NEXT_PUBLIC_MASTER_FACTORY_ADDRESS_ARC! as Address, // Arc Testnet
    31337: process.env.NEXT_PUBLIC_MASTER_FACTORY_ADDRESS_HARDHAT as Address || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512" as Address,
  };

  if (!addresses[chainId]) {
    throw new Error(`No MasterFactory address configured for chain ${chainId}. Supported chains: Celo Mainnet (42220), Celo Sepolia (11142220), Arc Testnet (5042002)`);
  }

  return addresses[chainId];
}

export function getCUSDAddress(chainId: number): Address {
  const addresses: Record<number, Address> = {
    11142220: "0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b" as Address, // Celo Sepolia cUSD
    42220: "0x765de816845861e75a25fca122bb6898b8b1282a" as Address, // Celo Mainnet cUSD
    5042002: "0x3600000000000000000000000000000000000000" as Address, // Arc Testnet USDC (native ERC-20 interface)
    31337: process.env.NEXT_PUBLIC_CUSD_ADDRESS_HARDHAT as Address || "0x5FbDB2315678afecb367f032d93F642f64180aa3" as Address, // Hardhat
  };

  if (!addresses[chainId]) {
    throw new Error(`No stablecoin address configured for chain ${chainId}. Supported chains: Celo Mainnet (42220), Celo Sepolia (11142220), Arc Testnet (5042002)`);
  }

  return addresses[chainId];
}

/**
 * Get the decimals for the stablecoin on a given chain
 * Celo chains use cUSD with 18 decimals
 * Arc uses USDC with 6 decimals
 */
export function getStablecoinDecimals(chainId: number): number {
  const decimals: Record<number, number> = {
    11142220: 18, // Celo Sepolia cUSD
    42220: 18,    // Celo Mainnet cUSD
    5042002: 6,   // Arc Testnet USDC
    31337: 18,    // Hardhat (usually cUSD mock)
  };

  return decimals[chainId] ?? 18; // Default to 18 if unknown
}

/**
 * Get the stablecoin symbol for display
 */
export function getStablecoinSymbol(chainId: number): string {
  const symbols: Record<number, string> = {
    11142220: 'cUSD',
    42220: 'cUSD',
    5042002: 'USDC',
    31337: 'cUSD',
  };

  return symbols[chainId] ?? 'cUSD';
}

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
  disputeReasonHash: `0x${string}`;
  resolutionHash?: `0x${string}`; // Optional - only set after dispute is raised
}

/**
 * Extended dispute info with resolved reason text (from KV storage)
 * Used by hooks that fetch both contract data and off-chain documents
 */
export interface DisputeInfoWithReason extends DisputeInfo {
  disputeReason: string; // Cleartext reason from KV
}

export interface FactoryStatistics {
  escrowsCreated: bigint;
  volumeProcessed: bigint;
  feesCollected: bigint;
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


export function getStateColor(state: EscrowState): string {
  switch (state) {
    case EscrowState.CREATED:
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
    case EscrowState.DISPUTED:
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";
    case EscrowState.COMPLETED:
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
    case EscrowState.REFUNDED:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100";
  }
}