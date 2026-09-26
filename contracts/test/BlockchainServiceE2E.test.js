const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BlockchainService } = require("../../server/blockchainService");
const { hashLandRecord } = require("../../server/landHasher");

describe("BlockchainService & LandVerification Contract Integration", function () {
  let landVerification;
  let owner;
  let operator;
  let service;
  let contractAddress;

  const sampleLandRecord = {
    ownerName: "Devendra Singh",
    state: "Maharashtra",
    district: "Pune",
    tehsil: "Haveli",
    village: "Wagholi",
    registrationNumber: "MH-PUN-2024-8841",
    surveyNo: "104/2B",
    area: "1200 sq ft",
  };

  beforeEach(async function () {
    [owner, operator] = await ethers.getSigners();

    const LandVerification = await ethers.getContractFactory("LandVerification");
    landVerification = await LandVerification.deploy();
    await landVerification.waitForDeployment();
    contractAddress = await landVerification.getAddress();

    // Create instance of service
    service = new BlockchainService();

    // Override config getter to use Hardhat local network and signer
    service.getConfig = () => ({
      rpcUrl: "http://127.0.0.1:8545",
      chainId: 1337,
      contractAddress: contractAddress,
      privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // hardhat default account 0
      explorerUrl: "https://testnet.bscscan.com/tx/",
      isConfigured: true,
    });

    // Provide signer and provider directly to service methods for testing
    service.getProvider = () => ethers.provider;
    service.getOperatorWallet = () => owner;
  });

  it("registers a land record on-chain and returns verification details", async function () {
    const regResult = await service.registerOnBlockchain(
      sampleLandRecord,
      sampleLandRecord.registrationNumber,
      "QmTestCid123"
    );

    expect(regResult.success).to.be.true;
    expect(regResult.verificationId).to.equal(1);
    expect(regResult.propertyId).to.equal("MH-PUN-2024-8841");
    expect(regResult.ipfsCid).to.equal("QmTestCid123");
    expect(regResult.transactionHash).to.be.a("string");
    expect(regResult.dataHash).to.equal(hashLandRecord(sampleLandRecord).dataHash);

    // Verify record on-chain
    const verifyResult = await service.verifyOnBlockchain(sampleLandRecord);
    expect(verifyResult.exists).to.be.true;
    expect(verifyResult.isValid).to.be.true;
    expect(verifyResult.isRevoked).to.be.false;
    expect(verifyResult.verificationId).to.equal(1);
    expect(verifyResult.propertyId).to.equal("MH-PUN-2024-8841");
    expect(verifyResult.ipfsCid).to.equal("QmTestCid123");
    expect(verifyResult.registeredBy).to.equal(owner.address);
  });

  it("verifies property matching on-chain", async function () {
    await service.registerOnBlockchain(
      sampleLandRecord,
      sampleLandRecord.registrationNumber,
      "QmTestCid123"
    );

    const matchCheck = await service.verifyPropertyOnBlockchain(
      sampleLandRecord,
      "MH-PUN-2024-8841"
    );
    expect(matchCheck.isValidMatch).to.be.true;
    expect(matchCheck.verificationId).to.equal(1);

    const mismatchCheck = await service.verifyPropertyOnBlockchain(
      sampleLandRecord,
      "WRONG-PROP-ID"
    );
    expect(mismatchCheck.isValidMatch).to.be.false;
  });

  it("rejects duplicate registration attempt", async function () {
    await service.registerOnBlockchain(
      sampleLandRecord,
      sampleLandRecord.registrationNumber,
      "QmTestCid123"
    );

    try {
      await service.registerOnBlockchain(
        sampleLandRecord,
        sampleLandRecord.registrationNumber,
        "QmTestCid123"
      );
      expect.fail("Should have thrown duplicate error");
    } catch (err) {
      expect(err.code || err.message).to.satisfy(
        (val) => String(val).includes("DUPLICATE_VERIFICATION") || String(val).includes("DuplicateVerification")
      );
    }
  });

  it("revokes a verification on-chain", async function () {
    const regResult = await service.registerOnBlockchain(
      sampleLandRecord,
      sampleLandRecord.registrationNumber,
      "QmTestCid123"
    );

    const revokeResult = await service.revokeOnBlockchain({
      verificationId: regResult.verificationId,
      reason: "Dispute recorded",
    });

    expect(revokeResult.success).to.be.true;
    expect(revokeResult.revoked).to.be.true;

    // Verify status now shows revoked
    const verifyAfter = await service.verifyOnBlockchain(sampleLandRecord);
    expect(verifyAfter.exists).to.be.true;
    expect(verifyAfter.isValid).to.be.false;
    expect(verifyAfter.isRevoked).to.be.true;
  });
});
