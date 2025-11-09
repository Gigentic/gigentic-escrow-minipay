# CheckPay API Documentation

Version: 1.0.0
Last Updated: 2025-11-09

## Table of Contents

1. [Overview](#overview)
2. [Smart Contract API](#smart-contract-api)
   - [MasterFactory Contract](#masterfactory-contract)
   - [EscrowContract](#escrowcontract)
3. [REST API](#rest-api)
   - [Authentication](#authentication)
   - [Document Management](#document-management)
   - [Admin Endpoints](#admin-endpoints)
   - [User Profile](#user-profile)
   - [Self Protocol Integration](#self-protocol-integration)
4. [Integration Guide](#integration-guide)
5. [Error Handling](#error-handling)

---

## Overview

CheckPay is a decentralized escrow protocol on Celo blockchain. This documentation covers:

- **Smart Contract API**: On-chain functions for creating and managing escrows
- **REST API**: Off-chain endpoints for document storage, admin operations, and user profiles
- **Integration Patterns**: Best practices for integrating with CheckPay

**Supported Networks:**
- Celo Mainnet (Chain ID: 42220)
- Celo Sepolia Testnet (Chain ID: 11142220)
- Hardhat Local (Chain ID: 31337)

**Currency:** All transactions use cUSD (Celo Dollar)

---

## Smart Contract API

### MasterFactory Contract

Factory contract for creating and managing escrow contracts.

**Deployment Addresses:**
- Celo Mainnet: `0x5549E67B9EEf5963c84BafEA64DD81bd5C72947c`
- Sepolia Testnet: `0x02Dc42666AECB9b780177d45591c2093e409e750`

**cUSD Token Addresses:**
- Celo Mainnet: `0x765de816845861e75a25fca122bb6898b8b1282a`
- Sepolia Testnet: `0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b`

#### State Variables

```solidity
address public admin;              // Contract administrator
address public arbiter;            // Dispute resolver
address public immutable cUSDAddress;  // cUSD token contract

// Registry
address[] public allEscrows;                    // All created escrows
mapping(address => address[]) public userEscrows;  // User -> their escrows
mapping(address => bool) public isValidEscrow;     // Escrow validity check

// Statistics
uint256 public totalEscrowsCreated;
uint256 public totalVolumeProcessed;
uint256 public totalFeesCollected;
```

#### Write Functions

##### `createEscrow`

Creates a new escrow contract and transfers funds.

```solidity
function createEscrow(
    address _recipient,
    uint256 _amount,
    bytes32 _deliverableHash
) external returns (address)
```

**Parameters:**
- `_recipient`: Recipient wallet address (cannot be zero address or msg.sender)
- `_amount`: Escrow amount in cUSD (must be > 0)
- `_deliverableHash`: Keccak256 hash of deliverable document (cannot be zero)

**Returns:** Address of the newly created escrow contract

**Requirements:**
- Caller must have approved MasterFactory to spend `totalRequired` cUSD
- `totalRequired = amount + (amount * 1%) + (amount * 4%)` = 105% of amount
- Recipient must be valid and different from caller

**Emits:** `EscrowCreated(escrowAddress, depositor, recipient, amount, deliverableHash)`

**Example:**
```javascript
// 1. Approve factory to spend cUSD
await cUSDContract.approve(factoryAddress, totalRequired);

// 2. Create escrow
const escrowAddress = await masterFactory.createEscrow(
    recipientAddress,
    parseUnits("100", 18),  // 100 cUSD
    deliverableHash
);
// Total required: 105 cUSD (100 + 1 fee + 4 bond)
```

##### `updateArbiter`

Updates the arbiter address (admin only).

```solidity
function updateArbiter(address _newArbiter) external onlyAdmin
```

**Parameters:**
- `_newArbiter`: New arbiter address (cannot be zero address)

**Emits:** `ArbiterUpdated(oldArbiter, newArbiter)`

##### `reportFeeCollection`

Internal function called by escrow contracts to track fees (only callable by valid escrows).

```solidity
function reportFeeCollection(uint256 feeAmount) external
```

#### Read Functions

##### `getUserEscrows`

Get all escrows associated with a user (as depositor or recipient).

```solidity
function getUserEscrows(address user) external view returns (address[] memory)
```

**Returns:** Array of escrow contract addresses

##### `getAllEscrows`

Get all escrows created through this factory.

```solidity
function getAllEscrows() external view returns (address[] memory)
```

**Returns:** Array of all escrow contract addresses

##### `getStatistics`

Get global platform statistics.

```solidity
function getStatistics() external view returns (
    uint256 escrowsCreated,
    uint256 volumeProcessed,
    uint256 feesCollected
)
```

**Returns:**
- `escrowsCreated`: Total number of escrows created
- `volumeProcessed`: Total cUSD volume processed
- `feesCollected`: Total platform fees collected

#### Events

```solidity
event EscrowCreated(
    address indexed escrowAddress,
    address indexed depositor,
    address indexed recipient,
    uint256 amount,
    bytes32 deliverableHash
);

event ArbiterUpdated(address oldArbiter, address newArbiter);
```

---

### EscrowContract

Individual escrow contract managing a single transaction.

#### Constants

```solidity
uint256 public constant PLATFORM_FEE_BPS = 100;   // 1% (100 basis points)
uint256 public constant DISPUTE_BOND_BPS = 400;   // 4% (400 basis points)
```

#### State Machine

Escrow states (enum):

```solidity
enum EscrowState {
    CREATED,    // 0: Initial state, funds locked
    DISPUTED,   // 1: Dispute raised, awaiting resolution
    COMPLETED,  // 2: Funds released to recipient
    REFUNDED    // 3: Funds returned to depositor
}
```

**Valid State Transitions:**
- `CREATED` → `COMPLETED` (via `complete()`)
- `CREATED` → `DISPUTED` (via `dispute()`)
- `DISPUTED` → `COMPLETED` (via `resolve(false, ...)`)
- `DISPUTED` → `REFUNDED` (via `resolve(true, ...)`)

#### State Variables

```solidity
// Immutable core data
address public immutable factory;
address public immutable depositor;
address public immutable recipient;
address public immutable arbiter;
IERC20 public immutable token;        // cUSD token

uint256 public immutable escrowAmount;    // 100% - actual escrow
uint256 public immutable platformFee;     // 1% of escrowAmount
uint256 public immutable disputeBond;     // 4% of escrowAmount
uint256 public immutable totalDeposited;  // 105% total
uint256 public immutable createdAt;       // Block timestamp

bytes32 public immutable deliverableHash;

// Mutable state
EscrowState public state;
bytes32 public disputeReasonHash;
bytes32 public resolutionHash;
```

#### Write Functions

##### `complete`

Completes the escrow successfully (depositor only).

```solidity
function complete() external onlyDepositor inState(CREATED) nonReentrant
```

**Access:** Only depositor
**State Required:** CREATED
**State After:** COMPLETED

**Effects:**
- Transfers `escrowAmount` to recipient
- Transfers `platformFee` to arbiter
- Returns `disputeBond` to depositor
- Reports fee to factory

**Emits:** `EscrowCompleted(recipient, escrowAmount)`

**Fund Distribution:**
```
Recipient:  100 cUSD (escrowAmount)
Arbiter:      1 cUSD (platformFee)
Depositor:    4 cUSD (disputeBond refund)
```

##### `dispute`

Raises a dispute (depositor or recipient only).

```solidity
function dispute(bytes32 _disputeReasonHash) external onlyParties inState(CREATED)
```

**Parameters:**
- `_disputeReasonHash`: Keccak256 hash of dispute document (cannot be zero)

**Access:** Only depositor or recipient
**State Required:** CREATED
**State After:** DISPUTED

**Emits:** `DisputeRaised(raiser, disputeReasonHash)`

##### `resolve`

Resolves a dispute (arbiter only).

```solidity
function resolve(
    bool favorDepositor,
    bytes32 _resolutionHash
) external onlyArbiter inState(DISPUTED) nonReentrant
```

**Parameters:**
- `favorDepositor`: If true, refund depositor; if false, pay recipient
- `_resolutionHash`: Keccak256 hash of resolution document (cannot be zero)

**Access:** Only arbiter
**State Required:** DISPUTED
**State After:** REFUNDED (if favorDepositor) or COMPLETED (if !favorDepositor)

**Effects (if favorDepositor = true):**
- Transfers `escrowAmount` to depositor (refund)
- Transfers `disputeBond` to depositor (bond refund)
- Transfers `platformFee` to arbiter
- State → REFUNDED

**Fund Distribution (Favor Depositor):**
```
Depositor: 104 cUSD (escrowAmount + disputeBond)
Arbiter:     1 cUSD (platformFee)
Recipient:   0 cUSD
```

**Effects (if favorDepositor = false):**
- Transfers `escrowAmount` to recipient
- Transfers `platformFee + disputeBond` to arbiter
- State → COMPLETED

**Fund Distribution (Favor Recipient):**
```
Recipient: 100 cUSD (escrowAmount)
Arbiter:     5 cUSD (platformFee + disputeBond penalty)
Depositor:   0 cUSD (loses bond)
```

**Emits:**
- `DisputeResolved(favorDepositor, resolutionHash, payoutAmount, feeAmount)`
- `EscrowRefunded(depositor, amount)` OR `EscrowCompleted(recipient, amount)`

#### Read Functions

##### `getDetails`

Get comprehensive escrow details.

```solidity
function getDetails() external view returns (
    address _depositor,
    address _recipient,
    uint256 _escrowAmount,
    uint256 _platformFee,
    uint256 _disputeBond,
    EscrowState _state,
    bytes32 _deliverableHash,
    uint256 _createdAt
)
```

##### `getDisputeInfo`

Get dispute-related information.

```solidity
function getDisputeInfo() external view returns (
    bytes32 _disputeReasonHash,
    bytes32 _resolutionHash
)
```

##### `getTotalValue`

Get total value locked in escrow.

```solidity
function getTotalValue() external view returns (uint256)
```

**Returns:** `escrowAmount + platformFee + disputeBond` (105% of original amount)

##### `getContractBalance`

Get actual cUSD balance of contract.

```solidity
function getContractBalance() external view returns (uint256)
```

#### Events

```solidity
event EscrowFunded(uint256 amount, uint256 fee, uint256 bond);

event EscrowCompleted(address indexed recipient, uint256 amount);

event EscrowRefunded(address indexed depositor, uint256 amount);

event DisputeRaised(address indexed raiser, bytes32 disputeReasonHash);

event DisputeResolved(
    bool favorDepositor,
    bytes32 resolutionHash,
    uint256 payoutAmount,
    uint256 feeAmount
);
```

---

## REST API

All REST API endpoints are served from the Next.js application.

**Base URL:** `https://your-domain.com/api`
**Content-Type:** `application/json`

### Authentication

CheckPay uses NextAuth.js with SIWE (Sign-In with Ethereum) for authentication.

#### Session-Based Auth

All authenticated endpoints require a valid session cookie. Sessions are established via the NextAuth flow.

**Auth Endpoints:**
- `POST /api/auth/[...nextauth]` - NextAuth handler (sign-in/sign-out)

**Auth Headers (for reference):**
```http
Cookie: next-auth.session-token=<session-token>
```

**Roles:**
- **User:** Regular authenticated user (can manage own escrows/profile)
- **Admin:** Has elevated permissions (can resolve disputes, view all disputes)

---

### Document Management

Documents (deliverables, disputes, resolutions) are stored in Upstash KV with hash-based keys.

#### Store Document

Store a deliverable, dispute, or resolution document.

**Endpoint:** `POST /api/documents/store`

**Authentication:** Required (session-based)

**Request Body:**
```json
{
  "hash": "0x1234...",
  "document": {
    // Document structure varies by type (see below)
  },
  "escrowAddress": "0xabc...",  // Required for deliverables
  "chainId": 42220
}
```

**Document Types:**

**Deliverable Document:**
```json
{
  "depositor": "0x...",
  "recipient": "0x...",
  "amount": "100000000000000000000",
  "description": "Website development",
  "acceptanceCriteria": "Responsive design, mobile-friendly",
  "deadline": 1699999999999
}
```

**Dispute Document:**
```json
{
  "escrowAddress": "0x...",
  "raiser": "0x...",
  "reason": "Deliverable does not meet acceptance criteria",
  "evidence": "Screenshots attached showing issues",
  "raisedAt": 1699999999999
}
```

**Resolution Document:**
```json
{
  "arbiter": "0x...",
  "favorDepositor": true,
  "reasoning": "Evidence supports depositor's claim",
  "resolvedAt": 1699999999999
}
```

**Authorization:**
- Deliverables: Only depositor, recipient, or admin
- Disputes: Only depositor, recipient, or admin
- Resolutions: Only admin

**Response (Success):**
```json
{
  "success": true,
  "hash": "0x1234...",
  "key": "deliverable:42220:0xabc...",
  "type": "deliverable"
}
```

**Response (Error):**
```json
{
  "error": "Document hash verification failed"
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid request (missing fields, hash mismatch)
- `401` - Not authenticated
- `403` - Not authorized
- `500` - Server error

#### Retrieve Document

Retrieve a document by hash.

**Endpoint:** `GET /api/documents/[hash]`

**Authentication:** Required

**URL Parameters:**
- `hash` - Document hash (hex string)

**Query Parameters:**
- `chainId` - Chain ID (required)
- `type` - Document type: `deliverable`, `dispute`, or `resolution`
- `escrowAddress` - Required for deliverables

**Example:**
```
GET /api/documents/0x1234...?chainId=42220&type=deliverable&escrowAddress=0xabc...
```

**Response (Success):**
```json
{
  "document": {
    // Document content
  }
}
```

**Response (Error):**
```json
{
  "error": "Document not found"
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid parameters
- `401` - Not authenticated
- `404` - Document not found
- `500` - Server error

---

### Admin Endpoints

Administrative endpoints for managing disputes and viewing platform statistics.

#### List Disputes

List all disputed escrows on a specific chain.

**Endpoint:** `GET /api/admin/disputes`

**Authentication:** Required (Admin only)

**Query Parameters:**
- `chainId` - Chain ID (required)

**Example:**
```
GET /api/admin/disputes?chainId=42220
```

**Response:**
```json
{
  "count": 2,
  "disputes": [
    {
      "address": "0xescrow1...",
      "depositor": "0xdepositor...",
      "recipient": "0xrecipient...",
      "escrowAmount": "100000000000000000000",
      "platformFee": "1000000000000000000",
      "disputeBond": "4000000000000000000",
      "deliverableHash": "0xhash...",
      "createdAt": "1699999999",
      "disputeReason": "Work not completed as agreed"
    }
  ]
}
```

**Status Codes:**
- `200` - Success
- `400` - Missing or invalid chainId
- `401` - Not authenticated
- `403` - Not admin
- `500` - Server error

#### Get Dispute Details

Get details of a specific disputed escrow.

**Endpoint:** `GET /api/admin/disputes/[id]`

**Authentication:** Required (Admin only)

**URL Parameters:**
- `id` - Escrow contract address

**Query Parameters:**
- `chainId` - Chain ID (required)

**Response:** Same as individual dispute object in list response

#### Resolve Dispute

Submit a dispute resolution (updates off-chain records).

**Endpoint:** `POST /api/admin/resolve`

**Authentication:** Required (Admin only)

**Request Body:**
```json
{
  "escrowAddress": "0xescrow...",
  "favorDepositor": true,
  "reasoning": "Evidence supports depositor's claim",
  "chainId": 42220
}
```

**Response:**
```json
{
  "success": true,
  "resolutionHash": "0xhash..."
}
```

**Note:** This endpoint stores the resolution document. The admin must still call the `resolve()` function on the escrow contract to execute on-chain.

**Status Codes:**
- `200` - Success
- `400` - Invalid request
- `401` - Not authenticated
- `403` - Not admin
- `500` - Server error

#### Platform Statistics

Get platform-wide statistics.

**Endpoint:** `GET /api/admin/stats`

**Authentication:** Required (Admin only)

**Query Parameters:**
- `chainId` - Chain ID (required)

**Response:**
```json
{
  "totalEscrows": 150,
  "totalVolume": "15000000000000000000000",
  "totalFees": "150000000000000000000",
  "activeEscrows": 45,
  "completedEscrows": 95,
  "disputedEscrows": 5,
  "refundedEscrows": 5
}
```

---

### User Profile

User profile management with optional Self Protocol verification.

#### Get Profile

Get user profile by address.

**Endpoint:** `GET /api/profile/[address]`

**Authentication:** Not required (public)

**URL Parameters:**
- `address` - Wallet address

**Response:**
```json
{
  "name": "John Doe",
  "bio": "Web developer and designer",
  "isVerified": true,
  "verifiedAt": 1699999999999
}
```

**Status Codes:**
- `200` - Success
- `404` - Profile not found
- `500` - Server error

#### Update Profile

Update or create user profile.

**Endpoint:** `POST /api/profile`

**Authentication:** Required (session-based)

**Request Body:**
```json
{
  "name": "John Doe",
  "bio": "Web developer and designer"
}
```

**Validation:**
- `name`: Required, non-empty string, max 50 characters
- `bio`: Required string (can be empty), max 500 characters

**Response:**
```json
{
  "success": true,
  "profile": {
    "name": "John Doe",
    "bio": "Web developer and designer",
    "isVerified": false
  }
}
```

**Note:** Verification fields (`isVerified`, `verifiedAt`) are preserved from existing profile and can only be updated via Self Protocol verification.

**Status Codes:**
- `200` - Success
- `400` - Validation error
- `401` - Not authenticated
- `500` - Server error

#### Delete Profile

Delete user profile.

**Endpoint:** `DELETE /api/profile`

**Authentication:** Required (session-based)

**Response:**
```json
{
  "success": true,
  "message": "Profile deleted successfully"
}
```

**Status Codes:**
- `200` - Success
- `401` - Not authenticated
- `500` - Server error

---

### Self Protocol Integration

Self Protocol provides human verification via passport/ID scanning.

#### Verify Human

Verify Self Protocol proof (called by Self Protocol after user completes verification).

**Endpoint:** `POST /api/self/verify`

**Authentication:** Not required (public callback)

**Request Body:**
```json
{
  "attestationId": "...",
  "proof": { /* ZK proof object */ },
  "publicSignals": [ /* Public signals array */ ],
  "userContextData": "0xUserAddress"
}
```

**Verification Requirements (hardcoded):**
- Minimum age: 18
- Excluded countries: Iran (IRN), North Korea (PRK)
- OFAC check: true
- Mock passport: false (production mode)

**Response (Success):**
```json
{
  "status": "success",
  "result": true,
  "message": "Human verification successful",
  "credentialSubject": { /* Disclosed claims */ },
  "verifiedAt": 1699999999999
}
```

**Response (Error - No Profile):**
```json
{
  "status": "error",
  "message": "No profile found. Please create a profile first."
}
```

**Response (Error - Verification Failed):**
```json
{
  "status": "error",
  "result": false,
  "message": "Verification failed - proof is invalid",
  "details": { /* Validation details */ }
}
```

**Status Codes:**
- `200` - Success (verification passed)
- `400` - Verification failed or no profile
- `500` - Server error

**Note:** User must create a profile before verifying. The verification status is stored in the user's profile.

---

## Integration Guide

### Creating an Escrow (Full Flow)

**Step 1: Prepare Deliverable Document**

```javascript
const deliverable = {
  depositor: "0xDepositor...",
  recipient: "0xRecipient...",
  amount: "100000000000000000000", // 100 cUSD (18 decimals)
  description: "Website development",
  acceptanceCriteria: "Responsive design, mobile-friendly",
  deadline: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
};
```

**Step 2: Generate Hash**

```javascript
import { hashDocument } from '@/lib/hash';

const deliverableHash = hashDocument(deliverable);
// Returns: "0x1234..."
```

**Step 3: Store Deliverable**

```javascript
const response = await fetch('/api/documents/store', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    hash: deliverableHash,
    document: deliverable,
    escrowAddress: null, // Will be set after escrow creation
    chainId: 42220
  })
});
```

**Step 4: Approve cUSD Transfer**

```javascript
import { parseUnits } from 'viem';

// Calculate total required: amount + 1% fee + 4% bond
const amount = parseUnits("100", 18); // 100 cUSD
const fee = (amount * 100n) / 10000n;  // 1%
const bond = (amount * 400n) / 10000n; // 4%
const totalRequired = amount + fee + bond; // 105 cUSD

// Approve factory
const cUSDContract = { address: '0x765...', abi: ERC20_ABI };
await walletClient.writeContract({
  ...cUSDContract,
  functionName: 'approve',
  args: [factoryAddress, totalRequired]
});
```

**Step 5: Create Escrow**

```javascript
const escrowAddress = await publicClient.simulateContract({
  address: factoryAddress,
  abi: MASTER_FACTORY_ABI,
  functionName: 'createEscrow',
  args: [
    "0xRecipient...",
    amount,
    deliverableHash
  ]
}).then(result => walletClient.writeContract(result.request))
  .then(hash => publicClient.waitForTransactionReceipt({ hash }))
  .then(receipt => {
    // Parse EscrowCreated event to get escrow address
    return receipt.logs[0].address;
  });
```

**Step 6: Update Deliverable with Escrow Address**

```javascript
await fetch('/api/documents/store', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    hash: deliverableHash,
    document: { ...deliverable, escrowAddress },
    escrowAddress: escrowAddress,
    chainId: 42220
  })
});
```

### Completing an Escrow

```javascript
// Depositor calls complete()
await walletClient.writeContract({
  address: escrowAddress,
  abi: ESCROW_CONTRACT_ABI,
  functionName: 'complete',
  args: []
});
```

### Raising a Dispute

**Step 1: Create Dispute Document**

```javascript
const dispute = {
  escrowAddress: "0xEscrow...",
  raiser: "0xRaiser...",
  reason: "Work does not meet acceptance criteria",
  evidence: "Screenshots and documentation attached",
  raisedAt: Date.now()
};
```

**Step 2: Hash and Store**

```javascript
const disputeHash = hashDocument(dispute);

await fetch('/api/documents/store', {
  method: 'POST',
  body: JSON.stringify({
    hash: disputeHash,
    document: dispute,
    chainId: 42220
  })
});
```

**Step 3: Call dispute() on Contract**

```javascript
await walletClient.writeContract({
  address: escrowAddress,
  abi: ESCROW_CONTRACT_ABI,
  functionName: 'dispute',
  args: [disputeHash]
});
```

### Resolving a Dispute (Admin)

**Step 1: Create Resolution Document**

```javascript
const resolution = {
  arbiter: "0xArbiter...",
  favorDepositor: true, // or false
  reasoning: "Evidence supports the depositor's claim",
  resolvedAt: Date.now()
};
```

**Step 2: Hash and Store**

```javascript
const resolutionHash = hashDocument(resolution);

await fetch('/api/admin/resolve', {
  method: 'POST',
  body: JSON.stringify({
    escrowAddress: "0xEscrow...",
    favorDepositor: true,
    reasoning: resolution.reasoning,
    chainId: 42220
  })
});
```

**Step 3: Call resolve() on Contract**

```javascript
await walletClient.writeContract({
  address: escrowAddress,
  abi: ESCROW_CONTRACT_ABI,
  functionName: 'resolve',
  args: [true, resolutionHash] // favorDepositor, resolutionHash
});
```

### Querying Escrow State

**Get All User Escrows:**

```javascript
const userEscrows = await publicClient.readContract({
  address: factoryAddress,
  abi: MASTER_FACTORY_ABI,
  functionName: 'getUserEscrows',
  args: ["0xUser..."]
});
```

**Get Escrow Details:**

```javascript
const details = await publicClient.readContract({
  address: escrowAddress,
  abi: ESCROW_CONTRACT_ABI,
  functionName: 'getDetails'
});

const [
  depositor,
  recipient,
  escrowAmount,
  platformFee,
  disputeBond,
  state, // 0=CREATED, 1=DISPUTED, 2=COMPLETED, 3=REFUNDED
  deliverableHash,
  createdAt
] = details;
```

**Get Dispute Information:**

```javascript
const [disputeReasonHash, resolutionHash] = await publicClient.readContract({
  address: escrowAddress,
  abi: ESCROW_CONTRACT_ABI,
  functionName: 'getDisputeInfo'
});

// Fetch dispute document from API
const response = await fetch(
  `/api/documents/${disputeReasonHash}?chainId=42220&type=dispute`
);
const { document: dispute } = await response.json();
```

### User Profile & Verification

**Create Profile:**

```javascript
await fetch('/api/profile', {
  method: 'POST',
  body: JSON.stringify({
    name: "John Doe",
    bio: "Web developer"
  })
});
```

**Initiate Self Protocol Verification:**

```javascript
// Frontend integration (see Self Protocol docs)
import { SelfFrontend } from '@selfxyz/core';

const selfFrontend = new SelfFrontend({
  scope: process.env.NEXT_PUBLIC_SELF_SCOPE,
  endpoint: process.env.NEXT_PUBLIC_SELF_ENDPOINT,
  userIdentifier: walletAddress,
  verificationConfig: {
    excludedCountries: ['IRN', 'PRK'],
    ofac: true,
    minimumAge: 18
  }
});

// When user completes verification, Self Protocol calls:
// POST /api/self/verify (webhook)
```

---

## Error Handling

### Smart Contract Errors

**Common Revert Reasons:**

```
"Only admin"                      - Caller is not admin
"Only depositor"                  - Caller is not depositor
"Only arbiter"                    - Caller is not arbiter
"Only parties"                    - Caller is not depositor or recipient
"Invalid state"                   - Operation not allowed in current state
"Invalid recipient"               - Recipient is zero address or same as depositor
"Amount must be greater than 0"   - Amount is zero
"Deliverable hash required"       - Hash is zero
"Dispute reason hash required"    - Dispute hash is zero
"Resolution hash required"        - Resolution hash is zero
```

**Example Error Handling:**

```javascript
try {
  await walletClient.writeContract({
    address: escrowAddress,
    abi: ESCROW_CONTRACT_ABI,
    functionName: 'complete'
  });
} catch (error) {
  if (error.message.includes('Only depositor')) {
    console.error('Only the depositor can complete this escrow');
  } else if (error.message.includes('Invalid state')) {
    console.error('Escrow is not in CREATED state');
  }
}
```

### REST API Errors

**Standard Error Response:**

```json
{
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**

- `400 Bad Request` - Invalid input, validation failed
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Authenticated but not authorized (e.g., not admin)
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

**Example Error Handling:**

```javascript
const response = await fetch('/api/documents/store', {
  method: 'POST',
  body: JSON.stringify(payload)
});

if (!response.ok) {
  const { error } = await response.json();

  switch (response.status) {
    case 400:
      console.error('Validation error:', error);
      break;
    case 401:
      console.error('Please sign in');
      break;
    case 403:
      console.error('Access denied:', error);
      break;
    default:
      console.error('Error:', error);
  }
}
```

---

## Appendix

### ABI References

Complete ABIs are available in the codebase:

- **MasterFactory ABI:** `apps/web/src/lib/escrow-config.ts`
- **EscrowContract ABI:** `apps/web/src/lib/escrow-config.ts`

### Gas Estimates

Approximate gas costs on Celo (as of 2024):

| Operation | Estimated Gas |
|-----------|--------------|
| `createEscrow()` | ~500,000 |
| `complete()` | ~80,000 |
| `dispute()` | ~50,000 |
| `resolve()` | ~100,000 |

**Note:** Actual gas costs may vary based on network conditions and contract state.

### Currency Formatting

All amounts are in cUSD with 18 decimals:

```javascript
import { formatUnits, parseUnits } from 'viem';

// Convert from wei to human-readable
const humanAmount = formatUnits(amount, 18); // "100.0"

// Convert from human-readable to wei
const weiAmount = parseUnits("100", 18); // 100000000000000000000n
```

### Hash Generation

Documents are hashed using Keccak256:

```javascript
import { keccak256, toBytes } from 'viem';

function hashDocument(document) {
  const jsonString = JSON.stringify(document);
  return keccak256(toBytes(jsonString));
}
```

### Network Configuration (Wagmi/Viem)

```javascript
import { celo, celoSepolia } from 'viem/chains';
import { createPublicClient, http } from 'viem';

const publicClient = createPublicClient({
  chain: celo, // or celoSepolia
  transport: http()
});
```


