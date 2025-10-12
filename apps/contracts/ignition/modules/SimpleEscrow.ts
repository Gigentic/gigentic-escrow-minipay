// SimpleEscrow deployment using Hardhat Ignition
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther } from "viem";

// Default values for deployment
const DEFAULT_RECIPIENT = "0x1c9a2e08aE1d17d9aA2D01F20f27a8b6b4b7efc9"; // Replace with actual recipient
const DEFAULT_AMOUNT: bigint = parseEther("0.001"); // 0.001 CELO

const SimpleEscrowModule = buildModule("SimpleEscrowModule", (m) => {
  // Get parameters or use defaults
  const recipient = m.getParameter("recipient", DEFAULT_RECIPIENT);
  const amount = m.getParameter("amount", DEFAULT_AMOUNT);

  // Deploy SimpleEscrow contract with recipient address and send value
  const escrow = m.contract("SimpleEscrow", [recipient], {
    value: amount,
  });

  return { escrow };
});

export default SimpleEscrowModule;

