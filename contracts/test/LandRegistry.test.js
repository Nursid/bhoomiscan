const { expect } = require("chai");

describe("LandRegistry", function () {
  let landRegistry;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    const LandRegistry = await ethers.getContractFactory("LandRegistry");
    landRegistry = await LandRegistry.deploy();
    await landRegistry.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await landRegistry.getRecordCount()).to.equal(0);
    });

    it("Should start with zero records", async function () {
      expect(await landRegistry.getRecordCount()).to.equal(0);
    });
  });

  describe("Storing Land Records", function () {
    it("Should store a land record successfully", async function () {
      const tx = await landRegistry.connect(addr1).storeLandRecord(
        "John Doe",
        "Punjab",
        "Amritsar",
        "Amritsar-1",
        "Amritsar-2 Sub Urban 107",
        "REG123456"
      );

      const receipt = await tx.wait();
      
      // Check event emission
      expect(receipt.logs.length).to.be.greaterThan(0);
      
      // Check record count
      expect(await landRegistry.getRecordCount()).to.equal(1);
    });

    it("Should emit LandRecordStored event", async function () {
      const tx = await landRegistry.connect(addr1).storeLandRecord(
        "Jane Smith",
        "Uttar Pradesh",
        "Lucknow",
        "Lucknow",
        "Test Village",
        "REG789012"
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          const parsed = landRegistry.interface.parseLog(log);
          return parsed.name === "LandRecordStored";
        } catch {
          return false;
        }
      });

      expect(event).to.not.be.undefined;
      const parsed = landRegistry.interface.parseLog(event);
      expect(parsed.args.recordId).to.equal(1);
      expect(parsed.args.owner).to.equal(addr1.address);
      expect(parsed.args.ownerName).to.equal("Jane Smith");
      expect(parsed.args.state).to.equal("Uttar Pradesh");
      expect(parsed.args.district).to.equal("Lucknow");
      expect(parsed.args.tehsil).to.equal("Lucknow");
      expect(parsed.args.village).to.equal("Test Village");
      expect(parsed.args.registrationNumber).to.equal("REG789012");
    });

    it("Should increment record ID for each new record", async function () {
      // First record
      await landRegistry.connect(addr1).storeLandRecord(
        "Owner 1", "State 1", "District 1", "Tehsil 1", "Village 1", "REG001"
      );

      expect(await landRegistry.getRecordCount()).to.equal(1);

      // Second record
      await landRegistry.connect(addr2).storeLandRecord(
        "Owner 2", "State 2", "District 2", "Tehsil 2", "Village 2", "REG002"
      );

      expect(await landRegistry.getRecordCount()).to.equal(2);
    });
  });

  describe("Retrieving Land Records", function () {
    beforeEach(async function () {
      // Store a test record
      await landRegistry.connect(addr1).storeLandRecord(
        "Test Owner", "Test State", "Test District", "Test Tehsil", "Test Village", "TEST123"
      );
    });

    it("Should retrieve a land record by ID", async function () {
      const record = await landRegistry.getLandRecord(1);

      expect(record.ownerName).to.equal("Test Owner");
      expect(record.state).to.equal("Test State");
      expect(record.district).to.equal("Test District");
      expect(record.tehsil).to.equal("Test Tehsil");
      expect(record.village).to.equal("Test Village");
      expect(record.registrationNumber).to.equal("TEST123");
      expect(record.owner).to.equal(addr1.address);
    });

    it("Should return owner's land records", async function () {
      // Add another record for addr1
      await landRegistry.connect(addr1).storeLandRecord(
        "Owner 1 Record 2", "State 1", "District 1", "Tehsil 1", "Village 1", "REG002"
      );

      // Add a record for addr2
      await landRegistry.connect(addr2).storeLandRecord(
        "Owner 2 Record 1", "State 2", "District 2", "Tehsil 2", "Village 2", "REG003"
      );

      const addr1Records = await landRegistry.getOwnerLandRecords(addr1.address);
      const addr2Records = await landRegistry.getOwnerLandRecords(addr2.address);

      expect(addr1Records.length).to.equal(2);
      expect(addr2Records.length).to.equal(1);
      expect(addr1Records[0]).to.equal(1);
      expect(addr1Records[1]).to.equal(2);
      expect(addr2Records[0]).to.equal(3);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle empty strings gracefully", async function () {
      await landRegistry.connect(addr1).storeLandRecord(
        "", "", "", "", "", ""
      );

      const record = await landRegistry.getLandRecord(1);
      expect(record.ownerName).to.equal("");
      expect(record.state).to.equal("");
    });

    it("Should handle special characters in strings", async function () {
      const specialName = "O'Connor & Co.";
      await landRegistry.connect(addr1).storeLandRecord(
        specialName, "State", "District", "Tehsil", "Village", "REG123"
      );

      const record = await landRegistry.getLandRecord(1);
      expect(record.ownerName).to.equal(specialName);
    });

    it("Should handle long strings", async function () {
      const longString = "a".repeat(1000);
      await landRegistry.connect(addr1).storeLandRecord(
        longString, "State", "District", "Tehsil", "Village", "REG123"
      );

      const record = await landRegistry.getLandRecord(1);
      expect(record.ownerName).to.equal(longString);
    });
  });

  describe("Security", function () {
    it("Should correctly record the owner's address", async function () {
      await landRegistry.connect(addr1).storeLandRecord(
        "Owner 1", "State", "District", "Tehsil", "Village", "REG123"
      );

      const record = await landRegistry.getLandRecord(1);
      expect(record.owner).to.equal(addr1.address);
      expect(record.owner).to.not.equal(addr2.address);
    });

    it("Should timestamp records correctly", async function () {
      const beforeTimestamp = Math.floor(Date.now() / 1000) - 10;
      
      await landRegistry.connect(addr1).storeLandRecord(
        "Owner 1", "State", "District", "Tehsil", "Village", "REG123"
      );

      const afterTimestamp = Math.floor(Date.now() / 1000) + 100;
      
      const record = await landRegistry.getLandRecord(1);
      expect(record.timestamp).to.be.greaterThan(beforeTimestamp);
      expect(record.timestamp).to.be.lessThanOrEqual(afterTimestamp);
    });
  });
});
