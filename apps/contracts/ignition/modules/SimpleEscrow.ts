// SimpleEscrow deployment using Hardhat Ignition
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther } from "viem";

// Default values for deployment
const DEFAULT_RECIPIENT = "0xDf47ec1FaFF640f42dB25CC107210cF76E1f2033"; // Replace with actual recipient
const DEFAULT_AMOUNT: bigint = parseEther("0.1");

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

