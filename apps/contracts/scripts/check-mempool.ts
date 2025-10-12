import { createPublicClient, http } from "viem";
import { celoAlfajores } from "viem/chains";
import "dotenv/config";

async function main() {
  const publicClient = createPublicClient({
    chain: celoAlfajores,
    transport: http(),
  });

  const address = "0x29C54a10EaD26BF555d8A20E0C5e261169402f87";

  console.log(`\n🔍 Checking mempool for ${address}\n`);

  // Check nonces
  const confirmedNonce = await publicClient.getTransactionCount({ 
    address: address as `0x${string}`,
    blockTag: 'latest' 
  });
  
  const pendingNonce = await publicClient.getTransactionCount({ 
    address: address as `0x${string}`,
    blockTag: 'pending' 
  });

  console.log(`✅ Confirmed nonce (on-chain): ${confirmedNonce}`);
  console.log(`⏳ Pending nonce (mempool):   ${pendingNonce}`);
  
  if (pendingNonce > confirmedNonce) {
    console.log(`\n⚠️  ${pendingNonce - confirmedNonce} transaction(s) stuck in mempool!`);
    console.log(`   Stuck nonce(s): ${confirmedNonce} to ${pendingNonce - 1}`);
  } else {
    console.log(`\n✅ No pending transactions!`);
  }

  // Check balance
  const balance = await publicClient.getBalance({ address: address as `0x${string}` });
  console.log(`\n💰 Balance: ${Number(balance) / 1e18} CELO`);

  // Try to get pending transaction details (if RPC supports it)
  console.log(`\n🔗 Manual check: https://celo-alfajores.blockscout.com/address/${address}?tab=txs\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

