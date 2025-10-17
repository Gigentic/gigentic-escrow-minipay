import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Factory deployment module
 * 
 * USAGE:
 * 
 * 1. For LOCAL/HARDHAT:
 *    a) Deploy MockCUSD first:
 *       pnpm exec hardhat ignition deploy ignition/modules/MockCUSD.ts --network localhost
 *    
 *    b) Deploy Factory with MockCUSD address:
 *       pnpm exec hardhat ignition deploy ignition/modules/Factory.ts --network localhost \
 *         --parameters '{"FactoryModule":{"cUSDAddress":"0x5FbDB2315678afecb367f032d93F642f64180aa3"}}'
 * 
 * 2. For TESTNETS/MAINNET (use real cUSD):
 *    pnpm exec hardhat ignition deploy ignition/modules/Factory.ts --network alfajores \
 *      --parameters '{"FactoryModule":{"cUSDAddress":"0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1"}}'
 * 
 * cUSD addresses:
 * - Celo Mainnet: 0x765de816845861e75a25fca122bb6898b8b1282a
 * - Sepolia Testnet: 0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b
 */

const FactoryModule = buildModule("FactoryModule", (m) => {
  // Get the cUSD token address (required parameter)
  const cUSDAddress = m.getParameter("cUSDAddress");
  
  // Deploy MasterFactory with the provided cUSD address
  const masterFactory = m.contract("MasterFactory", [cUSDAddress]);
  
  return { masterFactory };
});

export default FactoryModule;
