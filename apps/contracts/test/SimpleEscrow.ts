import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { getAddress, parseEther } from "viem";

describe("SimpleEscrow", function () {
  // Fixture to deploy SimpleEscrow with default setup
  async function deploySimpleEscrowFixture() {
    const escrowAmount = parseEther("0.001"); // 0.001 CELO

    // Get test accounts
    const [depositor, recipient, otherAccount] = await hre.viem.getWalletClients();

    // Deploy SimpleEscrow
    const escrow = await hre.viem.deployContract(
      "SimpleEscrow" as const,
      [recipient.account.address],
      {
        value: escrowAmount,
      }
    );

    const publicClient = await hre.viem.getPublicClient();

    return {
      escrow,
      escrowAmount,
      depositor,
      recipient,
      otherAccount,
      publicClient,
    };
  }

  describe("Deployment", function () {
    it("Should set the correct depositor", async function () {
      const { escrow, depositor } = await loadFixture(deploySimpleEscrowFixture);

      expect(await escrow.read.depositor()).to.equal(
        getAddress(depositor.account.address)
      );
    });

    it("Should set the correct recipient", async function () {
      const { escrow, recipient } = await loadFixture(deploySimpleEscrowFixture);

      expect(await escrow.read.recipient()).to.equal(
        getAddress(recipient.account.address)
      );
    });

    it("Should store the correct escrow amount", async function () {
      const { escrow, escrowAmount } = await loadFixture(deploySimpleEscrowFixture);

      expect(await escrow.read.amount()).to.equal(escrowAmount);
    });

    it("Should mark as deposited", async function () {
      const { escrow } = await loadFixture(deploySimpleEscrowFixture);

      expect(await escrow.read.isDeposited()).to.equal(true);
    });

    it("Should not be released initially", async function () {
      const { escrow } = await loadFixture(deploySimpleEscrowFixture);

      expect(await escrow.read.isReleased()).to.equal(false);
    });

    it("Should hold the escrowed funds", async function () {
      const { escrow, escrowAmount, publicClient } = await loadFixture(
        deploySimpleEscrowFixture
      );

      const balance = await publicClient.getBalance({
        address: escrow.address,
      });

      expect(balance).to.equal(escrowAmount);
    });

    it("Should fail if no CELO is sent", async function () {
      const [, recipient] = await hre.viem.getWalletClients();

      await expect(
        hre.viem.deployContract("SimpleEscrow" as const, [recipient.account.address], {
          value: 0n,
        })
      ).to.be.rejectedWith("Must deposit CELO");
    });
  });

  describe("escrowInfo", function () {
    it("Should return correct escrow information", async function () {
      const { escrow, depositor, recipient, escrowAmount } = await loadFixture(
        deploySimpleEscrowFixture
      );

      const info = await escrow.read.escrowInfo();

      expect(info[0]).to.equal(getAddress(depositor.account.address)); // depositor
      expect(info[1]).to.equal(getAddress(recipient.account.address)); // recipient
      expect(info[2]).to.equal(escrowAmount); // amount
      expect(info[3]).to.equal(true); // isDeposited
      expect(info[4]).to.equal(false); // isReleased
    });
  });

  describe("release", function () {
    it("Should allow depositor to release funds", async function () {
      const { escrow, recipient, escrowAmount, publicClient } = await loadFixture(
        deploySimpleEscrowFixture
      );

      const recipientBalanceBefore = await publicClient.getBalance({
        address: recipient.account.address,
      });

      // Release the funds
      await escrow.write.release();

      // Check contract balance is now zero
      const contractBalance = await publicClient.getBalance({
        address: escrow.address,
      });
      expect(contractBalance).to.equal(0n);

      // Check recipient received the funds
      const recipientBalanceAfter = await publicClient.getBalance({
        address: recipient.account.address,
      });
      expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(escrowAmount);

      // Check isReleased flag is set
      expect(await escrow.read.isReleased()).to.equal(true);
    });

    it("Should reject if non-depositor tries to release", async function () {
      const { escrow, otherAccount } = await loadFixture(deploySimpleEscrowFixture);

      // Try to release from a different account
      const escrowAsOther = await hre.viem.getContractAt(
        "SimpleEscrow",
        escrow.address,
        { client: { wallet: otherAccount } }
      );

      await expect(escrowAsOther.write.release()).to.be.rejectedWith(
        "Only depositor"
      );
    });

    it("Should reject if recipient tries to release", async function () {
      const { escrow, recipient } = await loadFixture(deploySimpleEscrowFixture);

      // Try to release from recipient account
      const escrowAsRecipient = await hre.viem.getContractAt(
        "SimpleEscrow",
        escrow.address,
        { client: { wallet: recipient } }
      );

      await expect(escrowAsRecipient.write.release()).to.be.rejectedWith(
        "Only depositor"
      );
    });

    it("Should reject if already released", async function () {
      const { escrow } = await loadFixture(deploySimpleEscrowFixture);

      // Release once
      await escrow.write.release();

      // Try to release again
      await expect(escrow.write.release()).to.be.rejectedWith(
        "Not ready to release"
      );
    });
  });

  describe("Edge Cases", function () {
    it("Should handle very small amounts", async function () {
      const [depositor, recipient] = await hre.viem.getWalletClients();
      const tinyAmount = 1n; // 1 wei

      const escrow = await hre.viem.deployContract(
        "SimpleEscrow" as const,
        [recipient.account.address],
        {
          value: tinyAmount,
        }
      );

      expect(await escrow.read.amount()).to.equal(tinyAmount);

      // Should still be able to release
      await expect(escrow.write.release()).to.be.fulfilled;
    });

    it("Should handle larger amounts", async function () {
      const [depositor, recipient] = await hre.viem.getWalletClients();
      const largeAmount = parseEther("10"); // 10 CELO

      const escrow = await hre.viem.deployContract(
        "SimpleEscrow" as const,
        [recipient.account.address],
        {
          value: largeAmount,
        }
      );

      expect(await escrow.read.amount()).to.equal(largeAmount);
    });
  });

  describe("State Machine", function () {
    it("Should follow correct state transitions", async function () {
      const { escrow } = await loadFixture(deploySimpleEscrowFixture);

      // Initial state
      expect(await escrow.read.isDeposited()).to.equal(true);
      expect(await escrow.read.isReleased()).to.equal(false);

      // After release
      await escrow.write.release();
      expect(await escrow.read.isDeposited()).to.equal(true);
      expect(await escrow.read.isReleased()).to.equal(true);
    });
  });
});

