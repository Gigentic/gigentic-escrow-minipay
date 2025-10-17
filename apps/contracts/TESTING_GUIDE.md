# Interactive Testing Guide

This guide shows you how to test the escrow contracts step-by-step in a local environment.

## Quick Test Commands

### Run All Tests
```bash
cd apps/contracts
pnpm test
```

### Run Single Test
```bash
# Run a specific test by name
pnpm hardhat test --grep "Should allow depositor to complete escrow"
```

---

## Step-by-Step Manual Testing

### Method 1: Using Interactive Script (Recommended)

**Terminal 1 - Start Local Node:**
```bash
cd apps/contracts
pnpm exec hardhat node
```
Keep this terminal running. You'll see 20 accounts with 10000 ETH each.

**Terminal 2 - Run Interactive Setup:**
```bash
cd apps/contracts
pnpm exec hardhat run scripts/interactive-test.ts --network localhost
```

This script will:
1. Deploy MockCUSD token
2. Deploy MasterFactory
3. Mint tokens to test users
4. Create a sample escrow
5. Print contract addresses and example commands

### Method 2: Manual Step-by-Step

**Step 1: Start Local Node**
```bash
cd apps/contracts
pnpm exec hardhat node
```

**Step 2: In New Terminal, Open Console**
```bash
cd apps/contracts
pnpm exec hardhat console --network localhost
```

**Step 3: Deploy Contracts (in console)**
```javascript
// Get signers
const [admin, user1, user2] = await hre.viem.getWalletClients();

// Deploy MockCUSD
const mockCUSD = await hre.viem.deployContract("MockCUSD");
console.log("MockCUSD:", mockCUSD.address);

// Deploy Factory
const factory = await hre.viem.deployContract("MasterFactory", [mockCUSD.address]);
console.log("Factory:", factory.address);

// Mint tokens to user1
await mockCUSD.write.mint([user1.account.address, 10000000000000000000000n]); // 10,000 tokens
```

**Step 4: Create an Escrow**
```javascript
// Prepare escrow parameters
const amount = 100000000000000000000n; // 100 tokens
const totalRequired = (amount * 10500n) / 10000n; // 105%
const deliverableHash = "0x" + " 1".repeat(64); // Simple hash for testing

// Approve factory to spend tokens (as user1)
const mockCUSDAsUser1 = await hre.viem.getContractAt("MockCUSD", mockCUSD.address, { client: { wallet: user1 } });
await mockCUSDAsUser1.write.approve([factory.address, totalRequired]);

// Create escrow (as user1)
const factoryAsUser1 = await hre.viem.getContractAt("MasterFactory", factory.address, { client: { wallet: user1 } });
await factoryAsUser1.write.createEscrow([user2.account.address, amount, deliverableHash]);

// Get escrow address
const escrows = await factory.read.getAllEscrows();
const escrowAddress = escrows[0];
console.log("Escrow created at:", escrowAddress);
```

---

after setup
```javascript
// Get contracts
const factory = await hre.viem.getContractAt("MasterFactory", "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512");
const escrow = await hre.viem.getContractAt("EscrowContract", "0xCafac3dD18aC6c6e92c921884f9E4176737C052c");
const mockCUSD = await hre.viem.getContractAt("MockCUSD", "0x5fbdb2315678afecb367f032d93f642f64180aa3");
const [admin, user1, user2] = await hre.viem.getWalletClients();

// Complete escrow (as user1)
const escrowAsUser1 = await hre.viem.getContractAt("EscrowContract", "0xCafac3dD18aC6c6e92c921884f9E4176737C052c", { client: { wallet: user1 } });
await escrowAsUser1.write.complete();

// OR Raise a dispute (as user1 or user2)
await escrowAsUser1.write.dispute(["Work not completed as specified"]);

// OR Resolve dispute (as admin/arbiter)
const escrowAsAdmin = await hre.viem.getContractAt("EscrowContract", "0xCafac3dD18aC6c6e92c921884f9E4176737C052c", { client: { wallet: admin } });
const resolutionHash = "0x9bd71f7b1b509261b472d1a30dfad6db245769304743489df177115b898c48ce";
await escrowAsAdmin.write.resolve([true, resolutionHash]); // true = favor depositor

// Check balances
console.log(await mockCUSD.read.balanceOf(["0x70997970c51812dc3a010c7d01b50e0d17dc79c8"]));
console.log(await mockCUSD.read.balanceOf(["0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc"]));

```

**Step 5: Interact with Escrow**
```javascript
// Get escrow contract
const escrow = await hre.viem.getContractAt("EscrowContract", escrowAddress);

// Check details
const details = await escrow.read.getDetails();
console.log("State:", details[5]); // 0 = CREATED

// Option A: Complete the escrow (happy path)
const escrowAsUser1 = await hre.viem.getContractAt("EscrowContract", escrowAddress, { client: { wallet: user1 } });
await escrowAsUser1.write.complete();
console.log("Escrow completed!");

// Option B: Raise a dispute
await escrowAsUser1.write.dispute(["Work not completed"]);
console.log("Dispute raised!");

// Option C: Resolve dispute (as admin)
const escrowAsAdmin = await hre.viem.getContractAt("EscrowContract", escrowAddress, { client: { wallet: admin } });
const resolutionHash = "0x" + "2".repeat(64);
await escrowAsAdmin.write.resolve([true, resolutionHash]); // true = favor depositor
console.log("Dispute resolved!");
```

**Step 6: Check Balances**
```javascript
// Check user balances
const user1Bal = await mockCUSD.read.balanceOf([user1.account.address]);
const user2Bal = await mockCUSD.read.balanceOf([user2.account.address]);
const arbiterBal = await mockCUSD.read.balanceOf([admin.account.address]);

console.log("User1 (Depositor):", user1Bal.toString());
console.log("User2 (Recipient):", user2Bal.toString());
console.log("Arbiter:", arbiterBal.toString());
```

---

## Test Scenarios to Try

### Scenario 1: Happy Path (Complete)
1. Create escrow
2. Complete escrow as depositor
3. Verify: Recipient gets 100%, depositor gets 4% bond back, arbiter gets 1% fee

### Scenario 2: Dispute - Favor Depositor
1. Create escrow
2. Raise dispute (depositor or recipient)
3. Resolve in favor of depositor
4. Verify: Depositor gets 100% + 4% bond, arbiter gets 1% fee

### Scenario 3: Dispute - Favor Recipient
1. Create escrow
2. Raise dispute
3. Resolve in favor of recipient
4. Verify: Recipient gets 100%, arbiter gets 1% fee + 4% bond

### Scenario 4: Test Access Control
1. Try to complete as recipient (should fail)
2. Try to resolve as non-arbiter (should fail)
3. Try to dispute from non-party (should fail)

### Scenario 5: Test State Transitions
1. Create escrow (CREATED)
2. Try to complete after dispute (should fail)
3. Try to dispute after complete (should fail)

---

## Useful Console Commands

```javascript
// Parse amounts
const { parseUnits, formatUnits } = require("viem");
parseUnits("100", 18); // Convert 100 to wei
formatUnits(100000000000000000000n, 18); // Convert wei to readable

// Generate hash
const { keccak256, toBytes } = require("viem");
keccak256(toBytes("My deliverable"));

// Get current block
const block = await hre.viem.getPublicClient().getBlockNumber();
console.log("Current block:", block);

// Check gas used
const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
console.log("Gas used:", receipt.gasUsed);
```

---

## Debugging Tips

1. **Transaction Failed?** 
   - Check allowance: `await mockCUSD.read.allowance([user1.address, factory.address])`
   - Check balance: `await mockCUSD.read.balanceOf([user1.address])`
   - Check state: `await escrow.read.state()`

2. **State Issues?**
   - States: 0=CREATED, 1=DISPUTED, 2=COMPLETED, 3=REFUNDED
   - Use: `await escrow.read.getDetails()` to see current state

3. **Access Control Issues?**
   - Make sure you're using the right wallet client
   - Check: `await escrow.read.depositor()`, `await escrow.read.arbiter()`

4. **Reset Everything**
   - Just restart the local node (Ctrl+C in terminal 1, then `pnpm hardhat node` again)

---

## Gas Usage Reference

Based on test results:
- Create Escrow: ~1,524,935 gas
- Complete: ~118,426 gas
- Dispute: ~69,439 gas
- Resolve: ~112,931 gas

---

## Next Steps

After manual testing, you might want to:
1. Deploy to Alfajores testnet
2. Test with real MiniPay wallet
3. Integrate with frontend
4. Add more complex scenarios

Happy testing! 🎉

