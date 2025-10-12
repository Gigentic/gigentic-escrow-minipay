import { parseEther } from "viem";
import hre from "hardhat";

async function main() {
  console.log("🚀 Deploying SimpleEscrow to Alfajores...\n");

  // Configuration
  const RECIPIENT_ADDRESS = "0xDf47ec1FaFF640f42dB25CC107210cF76E1f2033"; // ⚠️ CHANGE THIS!
  const ESCROW_AMOUNT = parseEther("0.001"); // 0.001 CELO

  console.log("📋 Deployment Configuration:");
  console.log(`   Network: ${hre.network.name}`);
  console.log(`   Recipient: ${RECIPIENT_ADDRESS}`);
  console.log(`   Amount: ${ESCROW_AMOUNT} wei (0.001 CELO)\n`);

  // Get deployer account
  const [deployer] = await hre.viem.getWalletClients();
  const deployerAddress = deployer.account.address;

  console.log(`👤 Deployer Address: ${deployerAddress}`);
  
  // Check deployer balance
  const publicClient = await hre.viem.getPublicClient();
  const balance = await publicClient.getBalance({ address: deployerAddress });
  console.log(`💰 Deployer Balance: ${balance} wei\n`);

  if (balance < ESCROW_AMOUNT) {
    throw new Error("❌ Insufficient balance for deployment!");
  }

  // Let Hardhat auto-manage nonce
  const nonce = await publicClient.getTransactionCount({ address: deployerAddress });
  console.log(`📌 Current nonce: ${nonce} (auto-managed by Hardhat)`);

  // Deploy contract (no explicit nonce - let Hardhat handle it)
  console.log("⏳ Deploying contract...");
  // Note: 'as const' is required for hardhat-viem (no TypeChain support for Viem yet)
  const escrow = await hre.viem.deployContract("SimpleEscrow" as const, [RECIPIENT_ADDRESS], {
    value: ESCROW_AMOUNT,
  });

  console.log(`✅ SimpleEscrow deployed to: ${escrow.address}\n`);

  // Read initial state
  console.log("📖 Reading initial contract state...");
  const depositor = await escrow.read.depositor();
  const recipient = await escrow.read.recipient();
  const amount = await escrow.read.amount();
  const isDeposited = await escrow.read.isDeposited();
  const isReleased = await escrow.read.isReleased();

  console.log("\n📊 Contract State:");
  console.log(`   Depositor: ${depositor}`);
  console.log(`   Recipient: ${recipient}`);
  console.log(`   Amount: ${amount} wei`);
  console.log(`   Is Deposited: ${isDeposited}`);
  console.log(`   Is Released: ${isReleased}\n`);

  // Verification instructions
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📝 VERIFICATION INSTRUCTIONS:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log("1️⃣  Manual Verification on Blockscout:");
  console.log(`   URL: https://celo-alfajores.blockscout.com/address/${escrow.address}\n`);
  console.log("2️⃣  Automatic Verification:");
  console.log(`   npx hardhat verify --network alfajores ${escrow.address} "${RECIPIENT_ADDRESS}"\n`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: escrow.address,
    deployer: deployerAddress,
    recipient: RECIPIENT_ADDRESS,
    amount: ESCROW_AMOUNT.toString(),
    deployedAt: new Date().toISOString(),
    blockscoutUrl: `https://celo-alfajores.blockscout.com/address/${escrow.address}`,
    verifyCommand: `npx hardhat verify --network alfajores ${escrow.address} "${RECIPIENT_ADDRESS}"`,
  };

  console.log("💾 Deployment Info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  console.log("\n✅ Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });

