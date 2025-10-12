import hre from "hardhat";
import { parseEther, formatEther } from "viem";

async function main() {
  console.log("🔄 Interacting with SimpleEscrow on Sepolia...\n");

  // ⚠️ CHANGE THIS to your deployed contract address
  const CONTRACT_ADDRESS = "0x5549E67B9EEf5963c84BafEA64DD81bd5C72947c";

  console.log(`📋 Network: ${hre.network.name}`);
  console.log(`📍 Contract: ${CONTRACT_ADDRESS}\n`);

  // Get wallet client and public client
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  
  // Get contract instance
  const escrow = await hre.viem.getContractAt("SimpleEscrow", CONTRACT_ADDRESS);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 CURRENT CONTRACT STATE");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Read contract state using escrowInfo for efficiency
  const info = await escrow.read.escrowInfo();
  const [depositor, recipient, amount, isDeposited, isReleased] = info;

  console.log(`👤 Depositor: ${depositor}`);
  console.log(`🎯 Recipient: ${recipient}`);
  console.log(`💰 Amount: ${formatEther(amount)} ETH`);
  console.log(`✅ Is Deposited: ${isDeposited}`);
  console.log(`🔓 Is Released: ${isReleased}\n`);

  // Check contract balance
  const contractBalance = await publicClient.getBalance({ address: CONTRACT_ADDRESS });
  console.log(`📦 Contract Balance: ${formatEther(contractBalance)} ETH\n`);

  // Check deployer address
  const deployerAddress = deployer.account.address;
  console.log(`🔑 Your Address: ${deployerAddress}`);
  console.log(`🔍 Are you the depositor? ${deployerAddress.toLowerCase() === depositor.toLowerCase()}\n`);

  // If not released and user is depositor, offer to release
  if (!isReleased && deployerAddress.toLowerCase() === depositor.toLowerCase()) {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔓 RELEASE FUNDS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    
    // Get recipient balance before
    const recipientBalanceBefore = await publicClient.getBalance({ 
      address: recipient as `0x${string}` 
    });
    console.log(`📊 Recipient balance before: ${formatEther(recipientBalanceBefore)} ETH\n`);

    console.log("⏳ Releasing funds to recipient...");
    const hash = await escrow.write.release();
    console.log(`📝 Transaction hash: ${hash}`);
    
    // Wait for transaction
    console.log("⏳ Waiting for confirmation...");
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}\n`);

    // Check updated state
    const [, , , , newIsReleased] = await escrow.read.escrowInfo();
    const recipientBalanceAfter = await publicClient.getBalance({ 
      address: recipient as `0x${string}` 
    });
    const newContractBalance = await publicClient.getBalance({ address: CONTRACT_ADDRESS });

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 UPDATED STATE");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log(`🔓 Is Released: ${newIsReleased}`);
    console.log(`📦 Contract Balance: ${formatEther(newContractBalance)} ETH`);
    console.log(`💰 Recipient balance after: ${formatEther(recipientBalanceAfter)} ETH`);
    console.log(`📈 Recipient received: ${formatEther(recipientBalanceAfter - recipientBalanceBefore)} ETH\n`);
  } else if (isReleased) {
    console.log("✅ Funds have already been released to the recipient!\n");
  } else {
    console.log("⚠️  You are not the depositor, so you cannot release the funds.\n");
    console.log(`   Only ${depositor} can release the funds.\n`);
  }

  // Explorer links
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔗 EXPLORER LINKS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log(`Contract: https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`);
  console.log(`Depositor: https://sepolia.etherscan.io/address/${depositor}`);
  console.log(`Recipient: https://sepolia.etherscan.io/address/${recipient}\n`);

  console.log("✅ Done!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:");
    console.error(error);
    process.exit(1);
  });

