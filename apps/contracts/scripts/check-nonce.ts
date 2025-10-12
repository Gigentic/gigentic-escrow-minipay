import hre from "hardhat";

async function main() {
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  const address = deployer.account.address;

  console.log(`Address: ${address}`);
  
  const nonce = await publicClient.getTransactionCount({ address });
  console.log(`Current nonce: ${nonce}`);
  
  const pendingNonce = await publicClient.getTransactionCount({ 
    address,
    blockTag: 'pending' 
  });
  console.log(`Pending nonce: ${pendingNonce}`);
  
  if (nonce !== pendingNonce) {
    console.log(`⚠️  There are ${pendingNonce - nonce} pending transactions`);
  } else {
    console.log(`✅ No pending transactions`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

