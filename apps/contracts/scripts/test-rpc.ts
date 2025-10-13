import { createPublicClient, http, formatEther, parseAbiItem } from "viem";
import { localhost } from "viem/chains";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const client = createPublicClient({
  chain: localhost,
  transport: http("http://127.0.0.1:8545"),
});

async function main() {
  console.log("🔍 Testing SimpleEscrow Contract");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log(`📍 Contract Address: ${CONTRACT_ADDRESS}\n`);

  // 1. Check contract exists (has code)
  console.log("1️⃣  Checking if contract is deployed...");
  const code = await client.getCode({ address: CONTRACT_ADDRESS });
  console.log(`   ✅ Contract has ${code?.length || 0} characters of bytecode\n`);

  // 2. Get contract balance
  console.log("2️⃣  Getting contract balance...");
  const balance = await client.getBalance({ address: CONTRACT_ADDRESS });
  console.log(`   💰 Balance: ${formatEther(balance)} ETH\n`);

  // 3. Call depositor()
  console.log("3️⃣  Calling depositor()...");
  const depositor = await client.readContract({
    address: CONTRACT_ADDRESS,
    abi: [parseAbiItem("function depositor() view returns (address)")],
    functionName: "depositor",
  });
  console.log(`   👤 Depositor: ${depositor}\n`);

  // 4. Call recipient()
  console.log("4️⃣  Calling recipient()...");
  const recipient = await client.readContract({
    address: CONTRACT_ADDRESS,
    abi: [parseAbiItem("function recipient() view returns (address)")],
    functionName: "recipient",
  });
  console.log(`   🎯 Recipient: ${recipient}\n`);

  // 5. Call amount()
  console.log("5️⃣  Calling amount()...");
  const amount = await client.readContract({
    address: CONTRACT_ADDRESS,
    abi: [parseAbiItem("function amount() view returns (uint256)")],
    functionName: "amount",
  });
  console.log(`   💵 Amount: ${formatEther(amount)} ETH\n`);

  // 6. Call isDeposited()
  console.log("6️⃣  Calling isDeposited()...");
  const isDeposited = await client.readContract({
    address: CONTRACT_ADDRESS,
    abi: [parseAbiItem("function isDeposited() view returns (bool)")],
    functionName: "isDeposited",
  });
  console.log(`   ✅ Is Deposited: ${isDeposited}\n`);

  // 7. Call isReleased()
  console.log("7️⃣  Calling isReleased()...");
  const isReleased = await client.readContract({
    address: CONTRACT_ADDRESS,
    abi: [parseAbiItem("function isReleased() view returns (bool)")],
    functionName: "isReleased",
  });
  console.log(`   🔓 Is Released: ${isReleased}\n`);

  // 8. Get latest block
  console.log("8️⃣  Getting latest block number...");
  const blockNumber = await client.getBlockNumber();
  console.log(`   📦 Block Number: ${blockNumber}\n`);

  // Summary
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 SUMMARY");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`Depositor: ${depositor}`);
  console.log(`Recipient: ${recipient}`);
  console.log(`Amount: ${formatEther(amount)} ETH`);
  console.log(`Contract Balance: ${formatEther(balance)} ETH`);
  console.log(`Is Deposited: ${isDeposited}`);
  console.log(`Is Released: ${isReleased}`);
  console.log(`Current Block: ${blockNumber}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

