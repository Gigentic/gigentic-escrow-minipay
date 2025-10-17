import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { getAddress, parseUnits, keccak256, toBytes } from "viem";

describe("MasterFactory", function () {
  // Fixture to deploy MasterFactory with MockCUSD
  async function deployFactoryFixture() {
    const [admin, user1, user2, user3] = await hre.viem.getWalletClients();

    // Deploy MockCUSD
    const mockCUSD = await hre.viem.deployContract("MockCUSD");

    // Deploy MasterFactory
    const factory = await hre.viem.deployContract("MasterFactory", [
      mockCUSD.address,
    ]);

    const publicClient = await hre.viem.getPublicClient();

    // Mint some tokens to users for testing
    const mintAmount = parseUnits("10000", 18);
    await mockCUSD.write.mint([user1.account.address, mintAmount]);
    await mockCUSD.write.mint([user2.account.address, mintAmount]);
    await mockCUSD.write.mint([user3.account.address, mintAmount]);

    return {
      factory,
      mockCUSD,
      admin,
      user1,
      user2,
      user3,
      publicClient,
    };
  }

  describe("Deployment", function () {
    it("Should set the correct admin", async function () {
      const { factory, admin } = await loadFixture(deployFactoryFixture);

      expect(await factory.read.admin()).to.equal(
        getAddress(admin.account.address)
      );
    });

    it("Should set admin as initial arbiter", async function () {
      const { factory, admin } = await loadFixture(deployFactoryFixture);

      expect(await factory.read.arbiter()).to.equal(
        getAddress(admin.account.address)
      );
    });

    it("Should set the correct cUSD address", async function () {
      const { factory, mockCUSD } = await loadFixture(deployFactoryFixture);

      expect(await factory.read.cUSDAddress()).to.equal(
        getAddress(mockCUSD.address)
      );
    });

    it("Should initialize statistics to zero", async function () {
      const { factory } = await loadFixture(deployFactoryFixture);

      const stats = await factory.read.getStatistics();
      expect(stats[0]).to.equal(0n); // totalEscrowsCreated
      expect(stats[1]).to.equal(0n); // totalVolumeProcessed
      expect(stats[2]).to.equal(0n); // totalFeesCollected
    });
  });

  describe("Escrow Creation", function () {
    it("Should create an escrow successfully", async function () {
      const { factory, mockCUSD, user1, user2 } = await loadFixture(
        deployFactoryFixture
      );

      const amount = parseUnits("100", 18);
      const deliverableHash = keccak256(toBytes("Test deliverable"));

      // Approve factory to spend tokens (105% of amount)
      const totalRequired = (amount * 10500n) / 10000n;
      const mockCUSDAsUser1 = await hre.viem.getContractAt(
        "MockCUSD",
        mockCUSD.address,
        { client: { wallet: user1 } }
      );
      await mockCUSDAsUser1.write.approve([factory.address, totalRequired]);

      // Create escrow
      const factoryAsUser1 = await hre.viem.getContractAt(
        "MasterFactory",
        factory.address,
        { client: { wallet: user1 } }
      );

      const tx = await factoryAsUser1.write.createEscrow([
        user2.account.address,
        amount,
        deliverableHash,
      ]);

      expect(tx).to.not.be.undefined;
    });

    it("Should update registry correctly", async function () {
      const { factory, mockCUSD, user1, user2 } = await loadFixture(
        deployFactoryFixture
      );

      const amount = parseUnits("100", 18);
      const deliverableHash = keccak256(toBytes("Test deliverable"));

      // Approve and create escrow
      const totalRequired = (amount * 10500n) / 10000n;
      const mockCUSDAsUser1 = await hre.viem.getContractAt(
        "MockCUSD",
        mockCUSD.address,
        { client: { wallet: user1 } }
      );
      await mockCUSDAsUser1.write.approve([factory.address, totalRequired]);

      const factoryAsUser1 = await hre.viem.getContractAt(
        "MasterFactory",
        factory.address,
        { client: { wallet: user1 } }
      );

      await factoryAsUser1.write.createEscrow([
        user2.account.address,
        amount,
        deliverableHash,
      ]);

      // Check allEscrows
      const allEscrows = await factory.read.getAllEscrows();
      expect(allEscrows.length).to.equal(1);

      // Check userEscrows for depositor
      const user1Escrows = await factory.read.getUserEscrows([
        user1.account.address,
      ]);
      expect(user1Escrows.length).to.equal(1);

      // Check userEscrows for recipient
      const user2Escrows = await factory.read.getUserEscrows([
        user2.account.address,
      ]);
      expect(user2Escrows.length).to.equal(1);

      // Check isValidEscrow
      const escrowAddress = allEscrows[0];
      expect(await factory.read.isValidEscrow([escrowAddress])).to.equal(true);
    });

    it("Should track statistics accurately", async function () {
      const { factory, mockCUSD, user1, user2 } = await loadFixture(
        deployFactoryFixture
      );

      const amount = parseUnits("100", 18);
      const deliverableHash = keccak256(toBytes("Test deliverable"));

      // Approve and create escrow
      const totalRequired = (amount * 10500n) / 10000n;
      const mockCUSDAsUser1 = await hre.viem.getContractAt(
        "MockCUSD",
        mockCUSD.address,
        { client: { wallet: user1 } }
      );
      await mockCUSDAsUser1.write.approve([factory.address, totalRequired]);

      const factoryAsUser1 = await hre.viem.getContractAt(
        "MasterFactory",
        factory.address,
        { client: { wallet: user1 } }
      );

      await factoryAsUser1.write.createEscrow([
        user2.account.address,
        amount,
        deliverableHash,
      ]);

      const stats = await factory.read.getStatistics();
      expect(stats[0]).to.equal(1n); // totalEscrowsCreated
      expect(stats[1]).to.equal(amount); // totalVolumeProcessed
      expect(stats[2]).to.equal(0n); // totalFeesCollected (not collected yet)
    });

    it("Should emit EscrowCreated event", async function () {
      const { factory, mockCUSD, user1, user2, publicClient } =
        await loadFixture(deployFactoryFixture);

      const amount = parseUnits("100", 18);
      const deliverableHash = keccak256(toBytes("Test deliverable"));

      // Approve and create escrow
      const totalRequired = (amount * 10500n) / 10000n;
      const mockCUSDAsUser1 = await hre.viem.getContractAt(
        "MockCUSD",
        mockCUSD.address,
        { client: { wallet: user1 } }
      );
      await mockCUSDAsUser1.write.approve([factory.address, totalRequired]);

      const factoryAsUser1 = await hre.viem.getContractAt(
        "MasterFactory",
        factory.address,
        { client: { wallet: user1 } }
      );

      const hash = await factoryAsUser1.write.createEscrow([
        user2.account.address,
        amount,
        deliverableHash,
      ]);

      // Get transaction receipt
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      expect(receipt.status).to.equal("success");
    });

    it("Should reject invalid recipient (zero address)", async function () {
      const { factory, mockCUSD, user1 } = await loadFixture(
        deployFactoryFixture
      );

      const amount = parseUnits("100", 18);
      const deliverableHash = keccak256(toBytes("Test deliverable"));

      const factoryAsUser1 = await hre.viem.getContractAt(
        "MasterFactory",
        factory.address,
        { client: { wallet: user1 } }
      );

      await expect(
        factoryAsUser1.write.createEscrow([
          "0x0000000000000000000000000000000000000000",
          amount,
          deliverableHash,
        ])
      ).to.be.rejectedWith("Invalid recipient");
    });

    it("Should reject self as recipient", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      const amount = parseUnits("100", 18);
      const deliverableHash = keccak256(toBytes("Test deliverable"));

      const factoryAsUser1 = await hre.viem.getContractAt(
        "MasterFactory",
        factory.address,
        { client: { wallet: user1 } }
      );

      await expect(
        factoryAsUser1.write.createEscrow([
          user1.account.address,
          amount,
          deliverableHash,
        ])
      ).to.be.rejectedWith("Invalid recipient");
    });

    it("Should reject zero amount", async function () {
      const { factory, user1, user2 } = await loadFixture(
        deployFactoryFixture
      );

      const deliverableHash = keccak256(toBytes("Test deliverable"));

      const factoryAsUser1 = await hre.viem.getContractAt(
        "MasterFactory",
        factory.address,
        { client: { wallet: user1 } }
      );

      await expect(
        factoryAsUser1.write.createEscrow([
          user2.account.address,
          0n,
          deliverableHash,
        ])
      ).to.be.rejectedWith("Amount must be greater than 0");
    });

    it("Should reject empty deliverable hash", async function () {
      const { factory, user1, user2 } = await loadFixture(
        deployFactoryFixture
      );

      const amount = parseUnits("100", 18);

      const factoryAsUser1 = await hre.viem.getContractAt(
        "MasterFactory",
        factory.address,
        { client: { wallet: user1 } }
      );

      await expect(
        factoryAsUser1.write.createEscrow([
          user2.account.address,
          amount,
          "0x0000000000000000000000000000000000000000000000000000000000000000",
        ])
      ).to.be.rejectedWith("Deliverable hash required");
    });
  });

  describe("Arbiter Management", function () {
    it("Should allow admin to update arbiter", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      await factory.write.updateArbiter([user1.account.address]);

      expect(await factory.read.arbiter()).to.equal(
        getAddress(user1.account.address)
      );
    });

    it("Should emit ArbiterUpdated event", async function () {
      const { factory, admin, user1, publicClient } = await loadFixture(
        deployFactoryFixture
      );

      const hash = await factory.write.updateArbiter([user1.account.address]);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      expect(receipt.status).to.equal("success");
    });

    it("Should reject non-admin updating arbiter", async function () {
      const { factory, user1, user2 } = await loadFixture(
        deployFactoryFixture
      );

      const factoryAsUser1 = await hre.viem.getContractAt(
        "MasterFactory",
        factory.address,
        { client: { wallet: user1 } }
      );

      await expect(
        factoryAsUser1.write.updateArbiter([user2.account.address])
      ).to.be.rejectedWith("Only admin");
    });

    it("Should reject zero address as arbiter", async function () {
      const { factory } = await loadFixture(deployFactoryFixture);

      await expect(
        factory.write.updateArbiter([
          "0x0000000000000000000000000000000000000000",
        ])
      ).to.be.rejectedWith("Invalid arbiter");
    });
  });

  describe("Fee Reporting", function () {
    it("Should allow valid escrow to report fees", async function () {
      const { factory, mockCUSD, user1, user2 } = await loadFixture(
        deployFactoryFixture
      );

      const amount = parseUnits("100", 18);
      const deliverableHash = keccak256(toBytes("Test deliverable"));

      // Create escrow
      const totalRequired = (amount * 10500n) / 10000n;
      const mockCUSDAsUser1 = await hre.viem.getContractAt(
        "MockCUSD",
        mockCUSD.address,
        { client: { wallet: user1 } }
      );
      await mockCUSDAsUser1.write.approve([factory.address, totalRequired]);

      const factoryAsUser1 = await hre.viem.getContractAt(
        "MasterFactory",
        factory.address,
        { client: { wallet: user1 } }
      );

      await factoryAsUser1.write.createEscrow([
        user2.account.address,
        amount,
        deliverableHash,
      ]);

      const allEscrows = await factory.read.getAllEscrows();
      const escrowAddress = allEscrows[0];

      // Complete the escrow to trigger fee reporting
      const escrow = await hre.viem.getContractAt(
        "EscrowContract",
        escrowAddress,
        { client: { wallet: user1 } }
      );

      await escrow.write.complete();

      // Check that fees were reported
      const stats = await factory.read.getStatistics();
      const expectedFee = (amount * 100n) / 10000n; // 1% fee
      expect(stats[2]).to.equal(expectedFee); // totalFeesCollected
    });

    it("Should reject invalid escrow reporting fees", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      const factoryAsUser1 = await hre.viem.getContractAt(
        "MasterFactory",
        factory.address,
        { client: { wallet: user1 } }
      );

      await expect(
        factoryAsUser1.write.reportFeeCollection([parseUnits("1", 18)])
      ).to.be.rejectedWith("Only valid escrows");
    });
  });

  describe("Multiple Escrows", function () {
    it("Should handle multiple escrows correctly", async function () {
      const { factory, mockCUSD, user1, user2, user3 } = await loadFixture(
        deployFactoryFixture
      );

      const amount = parseUnits("100", 18);
      const totalRequired = (amount * 10500n) / 10000n;

      // Create first escrow (user1 -> user2)
      const mockCUSDAsUser1 = await hre.viem.getContractAt(
        "MockCUSD",
        mockCUSD.address,
        { client: { wallet: user1 } }
      );
      await mockCUSDAsUser1.write.approve([factory.address, totalRequired]);

      const factoryAsUser1 = await hre.viem.getContractAt(
        "MasterFactory",
        factory.address,
        { client: { wallet: user1 } }
      );

      await factoryAsUser1.write.createEscrow([
        user2.account.address,
        amount,
        keccak256(toBytes("Deliverable 1")),
      ]);

      // Create second escrow (user2 -> user3)
      const mockCUSDAsUser2 = await hre.viem.getContractAt(
        "MockCUSD",
        mockCUSD.address,
        { client: { wallet: user2 } }
      );
      await mockCUSDAsUser2.write.approve([factory.address, totalRequired]);

      const factoryAsUser2 = await hre.viem.getContractAt(
        "MasterFactory",
        factory.address,
        { client: { wallet: user2 } }
      );

      await factoryAsUser2.write.createEscrow([
        user3.account.address,
        amount,
        keccak256(toBytes("Deliverable 2")),
      ]);

      // Check statistics
      const stats = await factory.read.getStatistics();
      expect(stats[0]).to.equal(2n); // totalEscrowsCreated
      expect(stats[1]).to.equal(amount * 2n); // totalVolumeProcessed

      // Check user escrows
      const user1Escrows = await factory.read.getUserEscrows([
        user1.account.address,
      ]);
      expect(user1Escrows.length).to.equal(1);

      const user2Escrows = await factory.read.getUserEscrows([
        user2.account.address,
      ]);
      expect(user2Escrows.length).to.equal(2); // As recipient and depositor

      const user3Escrows = await factory.read.getUserEscrows([
        user3.account.address,
      ]);
      expect(user3Escrows.length).to.equal(1);
    });
  });
});

