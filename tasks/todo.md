# Gigentic Escrow Contract Development Plan

## Overview
Set up and deploy the first version of the Gigentic Escrow smart contracts to Sepolia testnet.

## Current Status
✅ Hardhat already configured with:
- Solidity 0.8.28
- Celo networks (Sepolia & Mainnet)
- All necessary dependencies (@openzeppelin/contracts, viem, etc.)
- Deployment scripts structure
- TypeScript support

## Tasks

### 1. Environment Setup ✅
- [x] Create `.env` file in `apps/contracts/` with required variables
  - PRIVATE_KEY (for deployment account)
  - CELOSCAN_API_KEY (for contract verification)
- [x] Fund deployment wallet with Sepolia testnet CELO (for gas)
- [x] Fixed Hardhat configuration issues
  - Added `dotenv` package
  - Added `import "dotenv/config"` to hardhat.config.ts
  - Fixed deployment scripts to auto-confirm prompts
- [x] Verified deployment works (test Lock contract deployed successfully)

### 2. Smart Contract Implementation
- [ ] Create `MasterFactory.sol` contract
  - Factory pattern for escrow creation
  - Registry management
  - Arbiter configuration
  - Global statistics tracking
  - Uses cUSD token
  
- [ ] Create `EscrowContract.sol` contract
  - 4-state machine (CREATED, DISPUTED, COMPLETED, REFUNDED)
  - 1% platform fee + 4% dispute bond
  - Hash-based deliverable tracking
  - Complete, dispute, and resolve functions
  - ReentrancyGuard for security
  - SafeERC20 for token handling

### 3. Testing
- [ ] Create test suite for MasterFactory
  - Deployment tests
  - Escrow creation
  - Registry management
  - Arbiter updates
  - Statistics tracking
  
- [ ] Create test suite for EscrowContract
  - Fund transfer on creation (105% deposit)
  - Complete function (happy path)
  - Dispute function (both parties)
  - Resolve function (arbiter decisions)
  - Fee distribution
  - State transitions
  - Reentrancy protection

### 4. Deployment Scripts
- [ ] Create Hardhat Ignition module for MasterFactory
  - Deploy with testnet cUSD address
  - Save deployment addresses
  
- [ ] Update package.json deployment scripts to use new module

### 5. Deployment to Sepolia
- [ ] Compile contracts
- [ ] Run tests locally
- [ ] Deploy to Sepolia testnet
- [ ] Verify contracts on Celoscan
- [ ] Document deployed addresses

### 6. Post-Deployment
- [ ] Test deployed contract interactions
- [ ] Create example usage scripts
- [ ] Document deployment for team

## Key Information

### cUSD Addresses
- **Alfajores Testnet**: `0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1`
- **Celo Mainnet**: `0x765DE816845861e75A25fCA122bb6898B8B1282a`

### Getting Testnet Funds
- Sepolia Faucet: https://faucet.celo.org/sepolia
- Request CELO for gas fees
- Get testnet cUSD from faucet or by swapping

### Commands Reference
```bash
# From project root
pnpm contracts:compile              # Compile contracts
pnpm contracts:test                 # Run tests
pnpm contracts:deploy:sepolia     # Deploy to Alfajores

# From apps/contracts directory
cd apps/contracts
pnpm compile
pnpm test
pnpm verify --network sepolia <CONTRACT_ADDRESS>
```

## Notes
- Focus on simplicity and security
- Follow the contract specification exactly as documented
- Use OpenZeppelin contracts for security features
- Test thoroughly before deployment
- Keep gas costs optimized





