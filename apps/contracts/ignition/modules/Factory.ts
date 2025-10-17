import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * cUSD addresses for different networks:
 * - Celo Mainnet: 0x765DE816845861e75A25fCA122bb6898B8B1282a
 * - Alfajores Testnet: 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1
 * - Sepolia Testnet: 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1
 * - Local/Hardhat: Deploy MockCUSD
 */

const FactoryModule = buildModule("FactoryModule", (m) => {
  // Get network-specific cUSD address or deploy mock for local
  const chainId = m.getParameter("chainId", 31337); // Default to localhost
  
  let cUSDAddress;
  
  // Deploy MockCUSD for local/hardhat network
  if (chainId === 31337) {
    const mockCUSD = m.contract("MockCUSD");
    cUSDAddress = mockCUSD;
  } else {
    // Use actual cUSD addresses for testnets and mainnet
    const cUSDAddresses: { [key: number]: string } = {
      42220: "0x765DE816845861e75A25fCA122bb6898B8B1282a", // Celo Mainnet
      44787: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1", // Alfajores Testnet
      11142220: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1", // Sepolia Testnet
    };
    
    cUSDAddress = m.getParameter(
      "cUSDAddress",
      cUSDAddresses[chainId] || cUSDAddresses[44787] // Default to Alfajores
    );
  }
  
  // Deploy MasterFactory
  const masterFactory = m.contract("MasterFactory", [cUSDAddress]);
  
  return { masterFactory, cUSDAddress };
});

export default FactoryModule;

