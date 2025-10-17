import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * MockCUSD deployment module
 * 
 * Deploy this first on local/test networks:
 * pnpm exec hardhat ignition deploy ignition/modules/MockCUSD.ts --network localhost
 * 
 * Then use the deployed address for the Factory deployment.
 */

const MockCUSDModule = buildModule("MockCUSDModule", (m) => {
  const mockCUSD = m.contract("MockCUSD");
  
  return { mockCUSD };
});

export default MockCUSDModule;

