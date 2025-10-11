// Quick script to verify Hardhat setup and wallet connection
import hre from "hardhat";
import { formatEther } from "viem";

async function main() {
  console.log("🔍 Checking Hardhat Setup...\n");
  
  // Get network info
  const networkName = hre.network.name;
  const chainId = await hre.network.provider.send("eth_chainId");
  
  console.log("📡 Network:", networkName);
  console.log("   Chain ID:", parseInt(chainId, 16));
  
  // Get account from config
  const accounts = hre.network.config.accounts;
  
  if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
    console.log("❌ No accounts configured! Check your PRIVATE_KEY in .env");
    return;
  }
  
  // Get deployer address - we need to derive it from private key
  const [walletClient] = await hre.viem.getWalletClients();
  const deployerAddress = walletClient.account.address;
  
  console.log("\n👤 Deployer address:", deployerAddress);
  
  // Check balance
  const publicClient = await hre.viem.getPublicClient();
  const balance = await publicClient.getBalance({ address: deployerAddress });
  const balanceInCelo = formatEther(balance);
  
  console.log("   Balance:", balanceInCelo, "CELO");
  
  if (parseFloat(balanceInCelo) === 0) {
    console.log("❌ No CELO balance! Get testnet funds from https://faucet.celo.org/alfajores");
  } else {
    console.log("✅ Wallet is funded and ready!");
  }
  
  // Check if cUSD contract exists on this network
  const CUSD_ALFAJORES = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";
  const CUSD_MAINNET = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
  
  const cUsdAddress = parseInt(chainId, 16) === 44787 ? CUSD_ALFAJORES : CUSD_MAINNET;
  console.log("\n💵 cUSD Address:", cUsdAddress);
  
  try {
    const code = await publicClient.getBytecode({ address: cUsdAddress as `0x${string}` });
    if (!code || code === "0x") {
      console.log("❌ cUSD contract not found on this network");
    } else {
      console.log("✅ cUSD contract exists");
    }
  } catch (error) {
    console.log("⚠️  Could not verify cUSD contract:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

