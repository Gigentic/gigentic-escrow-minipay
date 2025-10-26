import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { getAddress, parseUnits, keccak256, toBytes } from "viem";

describe("EscrowContract", function () {
  // Fixture to deploy EscrowContract with MockCUSD
  async function deployEscrowFixture() {
    const [deployer, depositor, recipient, arbiter, otherAccount] =
      await hre.viem.getWalletClients();

    // Deploy MockCUSD
    const mockCUSD = await hre.viem.deployContract("MockCUSD");

    // Mint tokens to depositor
    const mintAmount = parseUnits("10000", 18);
    await mockCUSD.write.mint([depositor.account.address, mintAmount]);

    const escrowAmount = parseUnits("100", 18);
    const deliverableHash = keccak256(toBytes("Test deliverable document"));

    // Approve escrow contract to spend tokens (105% of amount)
    const totalRequired = (escrowAmount * 10500n) / 10000n;
    const mockCUSDAsDepositor = await hre.viem.getContractAt(
      "MockCUSD",
      mockCUSD.address,
      { client: { wallet: depositor } }
    );
    await mockCUSDAsDepositor.write.approve([deployer.account.address, totalRequired]);

    // Deploy factory to get valid factory address
    const factory = await hre.viem.deployContract("MasterFactory", [
      mockCUSD.address,
    ]);

    // Approve factory to spend tokens
    await mockCUSDAsDepositor.write.approve([factory.address, totalRequired]);

    const publicClient = await hre.viem.getPublicClient();

    return {
      mockCUSD,
      depositor,
      recipient,
      arbiter,
      otherAccount,
      escrowAmount,
      deliverableHash,
      factory,
      publicClient,
    };
  }

  // Helper to create an escrow through factory
  async function createEscrowThroughFactory() {
    const fixture = await deployEscrowFixture();
    const {
      factory,
      mockCUSD,
      depositor,
      recipient,
      escrowAmount,
      deliverableHash,
    } = fixture;

    const factoryAsDepositor = await hre.viem.getContractAt(
      "MasterFactory",
      factory.address,
      { client: { wallet: depositor } }
    );

    await factoryAsDepositor.write.createEscrow([
      recipient.account.address,
      escrowAmount,
      deliverableHash,
    ]);

    const allEscrows = await factory.read.getAllEscrows();
    const escrowAddress = allEscrows[0];

    const escrow = await hre.viem.getContractAt(
      "EscrowContract",
      escrowAddress
    );

    return { ...fixture, escrow, escrowAddress };
  }

  describe("Deployment", function () {
    it("Should transfer 105% from depositor on creation", async function () {
      const { mockCUSD, depositor, escrowAddress, escrowAmount } =
        await loadFixture(createEscrowThroughFactory);

      const escrowBalance = await mockCUSD.read.balanceOf([escrowAddress]);
      const expectedBalance = (escrowAmount * 10500n) / 10000n;

      expect(escrowBalance).to.equal(expectedBalance);
    });

    it("Should set immutable values correctly", async function () {
      const { escrow, depositor, recipient, arbiter, escrowAmount, deliverableHash } =
        await loadFixture(createEscrowThroughFactory);

      expect(await escrow.read.depositor()).to.equal(
        getAddress(depositor.account.address)
      );
      expect(await escrow.read.recipient()).to.equal(
        getAddress(recipient.account.address)
      );
      expect(await escrow.read.escrowAmount()).to.equal(escrowAmount);
      expect(await escrow.read.deliverableHash()).to.equal(deliverableHash);
    });

    it("Should calculate fees correctly", async function () {
      const { escrow, escrowAmount } = await loadFixture(
        createEscrowThroughFactory
      );

      const platformFee = await escrow.read.platformFee();
      const disputeBond = await escrow.read.disputeBond();
      const totalDeposited = await escrow.read.totalDeposited();

      // Platform fee should be 1%
      const expectedPlatformFee = (escrowAmount * 100n) / 10000n;
      expect(platformFee).to.equal(expectedPlatformFee);

      // Dispute bond should be 4%
      const expectedDisputeBond = (escrowAmount * 400n) / 10000n;
      expect(disputeBond).to.equal(expectedDisputeBond);

      // Total should be 105%
      const expectedTotal = escrowAmount + expectedPlatformFee + expectedDisputeBond;
      expect(totalDeposited).to.equal(expectedTotal);
    });

    it("Should initialize state to CREATED", async function () {
      const { escrow } = await loadFixture(createEscrowThroughFactory);

      expect(await escrow.read.state()).to.equal(0); // CREATED = 0
    });

    it("Should emit EscrowFunded event", async function () {
      // This is implicitly tested by successful creation
      const { escrow } = await loadFixture(createEscrowThroughFactory);
      expect(escrow).to.not.be.undefined;
    });
  });

  describe("Complete Function", function () {
    it("Should allow depositor to complete escrow", async function () {
      const { escrow, depositor } = await loadFixture(
        createEscrowThroughFactory
      );

      const escrowAsDepositor = await hre.viem.getContractAt(
        "EscrowContract",
        escrow.address,
        { client: { wallet: depositor } }
      );

      await expect(escrowAsDepositor.write.complete()).to.be.fulfilled;
    });

    it("Should distribute funds correctly on completion", async function () {
      const {
        escrow,
        mockCUSD,
        depositor,
        recipient,
        factory,
        escrowAmount,
      } = await loadFixture(createEscrowThroughFactory);

      const arbiter = await factory.read.arbiter();

      // Get initial balances
      const recipientBalanceBefore = await mockCUSD.read.balanceOf([
        recipient.account.address,
      ]);
      const depositorBalanceBefore = await mockCUSD.read.balanceOf([
        depositor.account.address,
      ]);
      const arbiterBalanceBefore = await mockCUSD.read.balanceOf([arbiter]);

      // Complete escrow
      const escrowAsDepositor = await hre.viem.getContractAt(
        "EscrowContract",
        escrow.address,
        { client: { wallet: depositor } }
      );
      await escrowAsDepositor.write.complete();

      // Get final balances
      const recipientBalanceAfter = await mockCUSD.read.balanceOf([
        recipient.account.address,
      ]);
      const depositorBalanceAfter = await mockCUSD.read.balanceOf([
        depositor.account.address,
      ]);
      const arbiterBalanceAfter = await mockCUSD.read.balanceOf([arbiter]);

      // Calculate expected amounts
      const platformFee = await escrow.read.platformFee();
      const disputeBond = await escrow.read.disputeBond();

      // Recipient should receive escrow amount
      expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(
        escrowAmount
      );

      // Depositor should receive dispute bond back
      expect(depositorBalanceAfter - depositorBalanceBefore).to.equal(
        disputeBond
      );

      // Arbiter should receive platform fee
      expect(arbiterBalanceAfter - arbiterBalanceBefore).to.equal(platformFee);
    });

    it("Should change state to COMPLETED", async function () {
      const { escrow, depositor } = await loadFixture(
        createEscrowThroughFactory
      );

      const escrowAsDepositor = await hre.viem.getContractAt(
        "EscrowContract",
        escrow.address,
        { client: { wallet: depositor } }
      );

      await escrowAsDepositor.write.complete();

      expect(await escrow.read.state()).to.equal(2); // COMPLETED = 2
    });

    it("Should emit EscrowCompleted event", async function () {
      const { escrow, depositor, publicClient } = await loadFixture(
        createEscrowThroughFactory
      );

      const escrowAsDepositor = await hre.viem.getContractAt(
        "EscrowContract",
        escrow.address,
        { client: { wallet: depositor } }
      );

      const hash = await escrowAsDepositor.write.complete();
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      expect(receipt.status).to.equal("success");
    });

    it("Should reject non-depositor completing", async function () {
      const { escrow, recipient } = await loadFixture(
        createEscrowThroughFactory
      );

      const escrowAsRecipient = await hre.viem.getContractAt(
        "EscrowContract",
        escrow.address,
        { client: { wallet: recipient } }
      );

      await expect(escrowAsRecipient.write.complete()).to.be.rejectedWith(
        "Only depositor"
      );
    });

    it("Should reject completing from DISPUTED state", async function () {
      const { escrow, depositor } = await loadFixture(
        createEscrowThroughFactory
      );

      const escrowAsDepositor = await hre.viem.getContractAt(
        "EscrowContract",
        escrow.address,
        { client: { wallet: depositor } }
      );

      // Dispute first
      const disputeHash = keccak256(toBytes("Test dispute reason"));
      await escrowAsDepositor.write.dispute([disputeHash]);

      // Try to complete
      await expect(escrowAsDepositor.write.complete()).to.be.rejectedWith(
        "Invalid state"
      );
    });

    it("Should reject completing twice", async function () {
      const { escrow, depositor } = await loadFixture(
        createEscrowThroughFactory
      );

      const escrowAsDepositor = await hre.viem.getContractAt(
        "EscrowContract",
        escrow.address,
        { client: { wallet: depositor } }
      );

      await escrowAsDepositor.write.complete();

      // Try to complete again
      await expect(escrowAsDepositor.write.complete()).to.be.rejectedWith(
        "Invalid state"
      );
    });
  });

  describe("Dispute Function", function () {
    it("Should allow depositor to raise dispute", async function () {
      const { escrow, depositor } = await loadFixture(
        createEscrowThroughFactory
      );

      const escrowAsDepositor = await hre.viem.getContractAt(
        "EscrowContract",
        escrow.address,
        { client: { wallet: depositor } }
      );

      const disputeHash = keccak256(toBytes("Deliverable not as specified"));
      await expect(
        escrowAsDepositor.write.dispute([disputeHash])
      ).to.be.fulfilled;
    });

    it("Should allow recipient to raise dispute", async function () {
      const { escrow, recipient } = await loadFixture(
        createEscrowThroughFactory
      );

      const escrowAsRecipient = await hre.viem.getContractAt(
        "EscrowContract",
        escrow.address,
        { client: { wallet: recipient } }
      );

      const disputeHash = keccak256(toBytes("Depositor refusing to complete"));
      await expect(
        escrowAsRecipient.write.dispute([disputeHash])
      ).to.be.fulfilled;
    });

    it("Should store dispute reason hash", async function () {
      const { escrow, depositor } = await loadFixture(
        createEscrowThroughFactory
      );

      const disputeHash = keccak256(toBytes("Deliverable incomplete"));

      const escrowAsDepositor = await hre.viem.getContractAt(
        "EscrowContract",
        escrow.address,
        { client: { wallet: depositor } }
      );

      await escrowAsDepositor.write.dispute([disputeHash]);

      const disputeInfo = await escrow.read.getDisputeInfo();
      expect(disputeInfo[0]).to.equal(disputeHash);
    });

    it("Should change state to DISPUTED", async function () {
      const { escrow, depositor } = await loadFixture(
        createEscrowThroughFactory
      );

      const escrowAsDepositor = await hre.viem.getContractAt(
        "EscrowContract",
        escrow.address,
        { client: { wallet: depositor } }
      );

      const disputeHash = keccak256(toBytes("Test reason"));
      await escrowAsDepositor.write.dispute([disputeHash]);

      expect(await escrow.read.state()).to.equal(1); // DISPUTED = 1
    });

    it("Should emit DisputeRaised event", async function () {
      const { escrow, depositor, publicClient } = await loadFixture(
        createEscrowThroughFactory
      );

      const escrowAsDepositor = await hre.viem.getContractAt(
        "EscrowContract",
        escrow.address,
        { client: { wallet: depositor } }
      );

      const disputeHash = keccak256(toBytes("Test reason"));
      const hash = await escrowAsDepositor.write.dispute([disputeHash]);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      expect(receipt.status).to.equal("success");
    });

    it("Should reject non-party raising dispute", async function () {
      const { escrow, otherAccount } = await loadFixture(
        createEscrowThroughFactory
      );

      const escrowAsOther = await hre.viem.getContractAt(
        "EscrowContract",
        escrow.address,
        { client: { wallet: otherAccount } }
      );

      const disputeHash = keccak256(toBytes("Test reason"));
      await expect(
        escrowAsOther.write.dispute([disputeHash])
      ).to.be.rejectedWith("Only parties");
    });

    it("Should reject zero dispute reason hash", async function () {
      const { escrow, depositor } = await loadFixture(
        createEscrowThroughFactory
      );

      const escrowAsDepositor = await hre.viem.getContractAt(
        "EscrowContract",
        escrow.address,
        { client: { wallet: depositor } }
      );

      const zeroHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
      await expect(escrowAsDepositor.write.dispute([zeroHash])).to.be.rejectedWith(
        "Dispute reason hash required"
      );
    });

    it("Should reject dispute from non-CREATED state", async function () {
      const { escrow, depositor } = await loadFixture(
        createEscrowThroughFactory
      );

      const escrowAsDepositor = await hre.viem.getContractAt(
        "EscrowContract",
        escrow.address,
        { client: { wallet: depositor } }
      );

      // Complete first
      await escrowAsDepositor.write.complete();

      // Try to dispute
      const disputeHash = keccak256(toBytes("Test reason"));
      await expect(
        escrowAsDepositor.write.dispute([disputeHash])
      ).to.be.rejectedWith("Invalid state");
    });
  });

  describe("Resolve Function - Favor Depositor", function () {
    async function createDisputedEscrow() {
      const fixture = await createEscrowThroughFactory();
      const { escrow, depositor } = fixture;

      const escrowAsDepositor = await hre.viem.getContractAt(
        "EscrowContract",
        escrow.address,
        { client: { wallet: depositor } }
      );

      const disputeHash = keccak256(toBytes("Test dispute"));
      await escrowAsDepositor.write.dispute([disputeHash]);

      return fixture;
    }

    it("Should allow arbiter to resolve in favor of depositor", async function () {
      const { escrow, factory } = await loadFixture(createDisputedEscrow);

      const arbiterAddress = await factory.read.arbiter();
      const [admin] = await hre.viem.getWalletClients(); // Admin is arbiter

      const escrowAsArbiter = await hre.viem.getContractAt(
        "EscrowContract",
        escrow.address,
        { client: { wallet: admin } }
      );

      const resolutionHash = keccak256(toBytes("Resolution document"));

      await expect(escrowAsArbiter.write.resolve([true, resolutionHash])).to.be
        .fulfilled;
    });

    it("Should distribute funds correctly when favoring depositor", async function () {
      const { escrow, mockCUSD, depositor, recipient, factory, escrowAmount } =
        await loadFixture(createDisputedEscrow);

      const arbiterAddress = await factory.read.arbiter();
      const [admin] = await hre.viem.getWalletClients();

      // Get initial balances
      const depositorBalanceBefore = await mockCUSD.read.balanceOf([
        depositor.account.address,
      ]);
      const recipientBalanceBefore = await mockCUSD.read.balanceOf([
        recipient.account.address,
      ]);
      const arbiterBalanceBefore = await mockCUSD.read.balanceOf([
        arbiterAddress,
      ]);

      // Resolve
      const escrowAsArbiter = await hre.viem.getContractAt(
        "EscrowContract",
        escrow.address,
        { client: { wallet: admin } }
      );

      const resolutionHash = keccak256(toBytes("Resolution document"));
      await escrowAsArbiter.write.resolve([true, resolutionHash]);

      // Get final balances
      const depositorBalanceAfter = await mockCUSD.read.balanceOf([
        depositor.account.address,
      ]);
      const recipientBalanceAfter = await mockCUSD.read.balanceOf([
        recipient.account.address,
      ]);
      const arbiterBalanceAfter = await mockCUSD.read.balanceOf([
        arbiterAddress,
      ]);

      const platformFee = await escrow.read.platformFee();
      const disputeBond = await escrow.read.disputeBond();

      // Depositor gets escrow amount + dispute bond
      expect(depositorBalanceAfter - depositorBalanceBefore).to.equal(
        escrowAmount + disputeBond
      );

      // Recipient gets nothing
      expect(recipientBalanceAfter).to.equal(recipientBalanceBefore);

      // Arbiter gets platform fee only
      expect(arbiterBalanceAfter - arbiterBalanceBefore).to.equal(platformFee);
    });

    it("Should change state to REFUNDED", async function () {
      const { escrow, factory } = await loadFixture(createDisputedEscrow);

      const [admin] = await hre.viem.getWalletClients();
      const escrowAsArbiter = await hre.viem.getContractAt(
        "EscrowContract",
        escrow.address,
        { client: { wallet: admin } }
      );

      const resolutionHash = keccak256(toBytes("Resolution document"));
      await escrowAsArbiter.write.resolve([true, resolutionHash]);

      expect(await escrow.read.state()).to.equal(3); // REFUNDED = 3
    });
  });

  describe("Resolve Function - Favor Recipient", function () {
    async function createDisputedEscrow() {
      const fixture = await createEscrowThroughFactory();
      const { escrow, depositor } = fixture;

      const escrowAsDepositor = await hre.viem.getContractAt(
        "EscrowContract",
        escrow.address,
        { client: { wallet: depositor } }
      );

      const disputeHash = keccak256(toBytes("Test dispute"));
      await escrowAsDepositor.write.dispute([disputeHash]);

      return fixture;
    }

    it("Should allow arbiter to resolve in favor of recipient", async function () {
      const { escrow } = await loadFixture(createDisputedEscrow);

      const [admin] = await hre.viem.getWalletClients();
      const escrowAsArbiter = await hre.viem.getContractAt(
        "EscrowContract",
        escrow.address,
        { client: { wallet: admin } }
      );

      const resolutionHash = keccak256(toBytes("Resolution document"));

      await expect(escrowAsArbiter.write.resolve([false, resolutionHash])).to.be
        .fulfilled;
    });

    it("Should distribute funds correctly when favoring recipient", async function () {
      const { escrow, mockCUSD, depositor, recipient, factory, escrowAmount } =
        await loadFixture(createDisputedEscrow);

      const arbiterAddress = await factory.read.arbiter();
      const [admin] = await hre.viem.getWalletClients();

      // Get initial balances
      const depositorBalanceBefore = await mockCUSD.read.balanceOf([
        depositor.account.address,
      ]);
      const recipientBalanceBefore = await mockCUSD.read.balanceOf([
        recipient.account.address,
      ]);
      const arbiterBalanceBefore = await mockCUSD.read.balanceOf([
        arbiterAddress,
      ]);

      // Resolve
      const escrowAsArbiter = await hre.viem.getContractAt(
        "EscrowContract",
        escrow.address,
        { client: { wallet: admin } }
      );

      const resolutionHash = keccak256(toBytes("Resolution document"));
      await escrowAsArbiter.write.resolve([false, resolutionHash]);

      // Get final balances
      const depositorBalanceAfter = await mockCUSD.read.balanceOf([
        depositor.account.address,
      ]);
      const recipientBalanceAfter = await mockCUSD.read.balanceOf([
        recipient.account.address,
      ]);
      const arbiterBalanceAfter = await mockCUSD.read.balanceOf([
        arbiterAddress,
      ]);

      const platformFee = await escrow.read.platformFee();
      const disputeBond = await escrow.read.disputeBond();

      // Depositor gets nothing (loses bond)
      expect(depositorBalanceAfter).to.equal(depositorBalanceBefore);

      // Recipient gets escrow amount
      expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(
        escrowAmount
      );

      // Arbiter gets platform fee + dispute bond
      expect(arbiterBalanceAfter - arbiterBalanceBefore).to.equal(
        platformFee + disputeBond
      );
    });

    it("Should change state to COMPLETED", async function () {
      const { escrow } = await loadFixture(createDisputedEscrow);

      const [admin] = await hre.viem.getWalletClients();
      const escrowAsArbiter = await hre.viem.getContractAt(
        "EscrowContract",
        escrow.address,
        { client: { wallet: admin } }
      );

      const resolutionHash = keccak256(toBytes("Resolution document"));
      await escrowAsArbiter.write.resolve([false, resolutionHash]);

      expect(await escrow.read.state()).to.equal(2); // COMPLETED = 2
    });

    it("Should store resolution hash", async function () {
      const { escrow } = await loadFixture(createDisputedEscrow);

      const [admin] = await hre.viem.getWalletClients();
      const escrowAsArbiter = await hre.viem.getContractAt(
        "EscrowContract",
        escrow.address,
        { client: { wallet: admin } }
      );

      const resolutionHash = keccak256(toBytes("Resolution document"));
      await escrowAsArbiter.write.resolve([false, resolutionHash]);

      const disputeInfo = await escrow.read.getDisputeInfo();
      expect(disputeInfo[1]).to.equal(resolutionHash);
    });

    it("Should reject non-arbiter resolving", async function () {
      const { escrow, depositor } = await loadFixture(createDisputedEscrow);

      const escrowAsDepositor = await hre.viem.getContractAt(
        "EscrowContract",
        escrow.address,
        { client: { wallet: depositor } }
      );

      const resolutionHash = keccak256(toBytes("Resolution document"));

      await expect(
        escrowAsDepositor.write.resolve([true, resolutionHash])
      ).to.be.rejectedWith("Only arbiter");
    });

    it("Should reject resolution from non-DISPUTED state", async function () {
      const { escrow } = await loadFixture(createEscrowThroughFactory);

      const [admin] = await hre.viem.getWalletClients();
      const escrowAsArbiter = await hre.viem.getContractAt(
        "EscrowContract",
        escrow.address,
        { client: { wallet: admin } }
      );

      const resolutionHash = keccak256(toBytes("Resolution document"));

      await expect(
        escrowAsArbiter.write.resolve([true, resolutionHash])
      ).to.be.rejectedWith("Invalid state");
    });

    it("Should reject empty resolution hash", async function () {
      const { escrow } = await loadFixture(createDisputedEscrow);

      const [admin] = await hre.viem.getWalletClients();
      const escrowAsArbiter = await hre.viem.getContractAt(
        "EscrowContract",
        escrow.address,
        { client: { wallet: admin } }
      );

      await expect(
        escrowAsArbiter.write.resolve([
          true,
          "0x0000000000000000000000000000000000000000000000000000000000000000",
        ])
      ).to.be.rejectedWith("Resolution hash required");
    });
  });

  describe("View Functions", function () {
    it("Should return correct details", async function () {
      const { escrow, depositor, recipient, escrowAmount, deliverableHash } =
        await loadFixture(createEscrowThroughFactory);

      const details = await escrow.read.getDetails();

      expect(details[0]).to.equal(getAddress(depositor.account.address));
      expect(details[1]).to.equal(getAddress(recipient.account.address));
      expect(details[2]).to.equal(escrowAmount);
      expect(details[5]).to.equal(0); // state = CREATED
      expect(details[6]).to.equal(deliverableHash);
    });

    it("Should return correct total value", async function () {
      const { escrow, escrowAmount } = await loadFixture(
        createEscrowThroughFactory
      );

      const totalValue = await escrow.read.getTotalValue();
      const expectedTotal = (escrowAmount * 10500n) / 10000n;

      expect(totalValue).to.equal(expectedTotal);
    });

    it("Should return correct contract balance", async function () {
      const { escrow, escrowAmount } = await loadFixture(
        createEscrowThroughFactory
      );

      const balance = await escrow.read.getContractBalance();
      const expectedBalance = (escrowAmount * 10500n) / 10000n;

      expect(balance).to.equal(expectedBalance);
    });

    it("Should return zero hash dispute info initially", async function () {
      const { escrow } = await loadFixture(createEscrowThroughFactory);

      const disputeInfo = await escrow.read.getDisputeInfo();

      const zeroHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
      expect(disputeInfo[0]).to.equal(zeroHash);
      expect(disputeInfo[1]).to.equal(zeroHash);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle very small amounts", async function () {
      const { factory, mockCUSD, depositor, recipient } = await loadFixture(
        deployEscrowFixture
      );

      const smallAmount = 100n; // Very small amount
      const deliverableHash = keccak256(toBytes("Small escrow"));

      const totalRequired = (smallAmount * 10500n) / 10000n;

      const mockCUSDAsDepositor = await hre.viem.getContractAt(
        "MockCUSD",
        mockCUSD.address,
        { client: { wallet: depositor } }
      );
      await mockCUSDAsDepositor.write.approve([factory.address, totalRequired]);

      const factoryAsDepositor = await hre.viem.getContractAt(
        "MasterFactory",
        factory.address,
        { client: { wallet: depositor } }
      );

      await expect(
        factoryAsDepositor.write.createEscrow([
          recipient.account.address,
          smallAmount,
          deliverableHash,
        ])
      ).to.be.fulfilled;
    });

    it("Should handle large amounts", async function () {
      const { factory, mockCUSD, depositor, recipient } = await loadFixture(
        deployEscrowFixture
      );

      // Mint more tokens for large escrow
      const largeAmount = parseUnits("10000", 18);
      await mockCUSD.write.mint([depositor.account.address, largeAmount * 2n]);

      const deliverableHash = keccak256(toBytes("Large escrow"));
      const totalRequired = (largeAmount * 10500n) / 10000n;

      const mockCUSDAsDepositor = await hre.viem.getContractAt(
        "MockCUSD",
        mockCUSD.address,
        { client: { wallet: depositor } }
      );
      await mockCUSDAsDepositor.write.approve([factory.address, totalRequired]);

      const factoryAsDepositor = await hre.viem.getContractAt(
        "MasterFactory",
        factory.address,
        { client: { wallet: depositor } }
      );

      await expect(
        factoryAsDepositor.write.createEscrow([
          recipient.account.address,
          largeAmount,
          deliverableHash,
        ])
      ).to.be.fulfilled;
    });

    it("Should leave zero balance after completion", async function () {
      const { escrow, depositor, mockCUSD, escrowAddress } = await loadFixture(
        createEscrowThroughFactory
      );

      const escrowAsDepositor = await hre.viem.getContractAt(
        "EscrowContract",
        escrow.address,
        { client: { wallet: depositor } }
      );

      await escrowAsDepositor.write.complete();

      const balance = await mockCUSD.read.balanceOf([escrowAddress]);
      expect(balance).to.equal(0n);
    });

    it("Should leave zero balance after dispute resolution", async function () {
      const { escrow, depositor, mockCUSD, escrowAddress } = await loadFixture(
        createEscrowThroughFactory
      );

      // Dispute
      const escrowAsDepositor = await hre.viem.getContractAt(
        "EscrowContract",
        escrow.address,
        { client: { wallet: depositor } }
      );
      const disputeHash = keccak256(toBytes("Test dispute"));
      await escrowAsDepositor.write.dispute([disputeHash]);

      // Resolve
      const [admin] = await hre.viem.getWalletClients();
      const escrowAsArbiter = await hre.viem.getContractAt(
        "EscrowContract",
        escrow.address,
        { client: { wallet: admin } }
      );

      const resolutionHash = keccak256(toBytes("Resolution document"));
      await escrowAsArbiter.write.resolve([true, resolutionHash]);

      const balance = await mockCUSD.read.balanceOf([escrowAddress]);
      expect(balance).to.equal(0n);
    });
  });
});

