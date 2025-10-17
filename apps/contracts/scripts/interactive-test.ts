import hre from "hardhat";
import { parseUnits, keccak256, toBytes } from "viem";

/**
 * Interactive test script for manual contract testing
 * Run with: pnpm hardhat run scripts/interactive-test.ts --network localhost
 * 
 * Make sure to start local node first:
 * pnpm hardhat node
 */

async function main() {
  console.log("\n🚀 Starting Interactive Contract Test\n");

  // Get wallet clients
  const [admin, user1, user2, user3] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  console.log("📝 Accounts:");
  console.log("  Admin:", admin.account.address);
  console.log("  User1 (Depositor):", user1.account.address);
  console.log("  User2 (Recipient):", user2.account.address);
  console.log("  User3 (Other):", user3.account.address);

  // Deploy MockCUSD
  console.log("\n💰 Deploying MockCUSD...");
  const mockCUSD = await hre.viem.deployContract("MockCUSD");
  console.log("  MockCUSD deployed at:", mockCUSD.address);

  // Deploy MasterFactory
  console.log("\n🏭 Deploying MasterFactory...");
  const factory = await hre.viem.deployContract("MasterFactory", [mockCUSD.address]);
  console.log("  MasterFactory deployed at:", factory.address);
  console.log("  Admin:", await factory.read.admin());
  console.log("  Arbiter:", await factory.read.arbiter());

  // Mint tokens to users
  console.log("\n💸 Minting tokens to users...");
  const mintAmount = parseUnits("10000", 18);
  await mockCUSD.write.mint([user1.account.address, mintAmount]);
  await mockCUSD.write.mint([user2.account.address, mintAmount]);
  
  const user1Balance = await mockCUSD.read.balanceOf([user1.account.address]);
  console.log(`  User1 balance: ${user1Balance} (${parseUnits("10000", 18)})`);

  // Create an escrow
  console.log("\n📦 Creating Escrow...");
  const escrowAmount = parseUnits("100", 18);
  const totalRequired = (escrowAmount * 10500n) / 10000n; // 105%
  const deliverableHash = keccak256(toBytes("Build a landing page with React"));

  console.log("  Escrow amount:", escrowAmount.toString());
  console.log("  Total required (105%):", totalRequired.toString());
  console.log("  Deliverable hash:", deliverableHash);

  // Approve factory to spend tokens
  console.log("\n✅ Approving tokens...");
  const mockCUSDAsUser1 = await hre.viem.getContractAt(
    "MockCUSD",
    mockCUSD.address,
    { client: { wallet: user1 } }
  );
  await mockCUSDAsUser1.write.approve([factory.address, totalRequired]);
  console.log("  Approved!");

  // Create escrow
  console.log("\n🔨 Creating escrow transaction...");
  const factoryAsUser1 = await hre.viem.getContractAt(
    "MasterFactory",
    factory.address,
    { client: { wallet: user1 } }
  );

  const hash = await factoryAsUser1.write.createEscrow([
    user2.account.address,
    escrowAmount,
    deliverableHash,
  ]);

  console.log("  Transaction hash:", hash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("  Transaction confirmed!");

  // Get escrow address
  const allEscrows = await factory.read.getAllEscrows();
  const escrowAddress = allEscrows[0];
  console.log("\n📍 Escrow Contract Address:", escrowAddress);

  // Get escrow details
  const escrow = await hre.viem.getContractAt("EscrowContract", escrowAddress);
  const details = await escrow.read.getDetails();

  console.log("\n📊 Escrow Details:");
  console.log("  Depositor:", details[0]);
  console.log("  Recipient:", details[1]);
  console.log("  Escrow Amount:", details[2].toString());
  console.log("  Platform Fee:", details[3].toString());
  console.log("  Dispute Bond:", details[4].toString());
  console.log("  State:", details[5]); // 0 = CREATED
  console.log("  Deliverable Hash:", details[6]);
  console.log("  Created At:", details[7].toString());

  // Check contract balance
  const contractBalance = await mockCUSD.read.balanceOf([escrowAddress]);
  console.log("\n💰 Escrow Contract Balance:", contractBalance.toString());

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

