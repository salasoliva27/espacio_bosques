import { expect } from "chai";
import { ethers } from "hardhat";
import { ProjectRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ProjectRegistry", function () {
  let registry: ProjectRegistry;
  let owner: SignerWithAddress;
  let validator1: SignerWithAddress;
  let validator2: SignerWithAddress;
  let validator3: SignerWithAddress;
  let planner: SignerWithAddress;

  beforeEach(async function () {
    [owner, validator1, validator2, validator3, planner] = await ethers.getSigners();

    const ProjectRegistry = await ethers.getContractFactory("ProjectRegistry");
    registry = await ProjectRegistry.deploy();

    // Grant roles
    const VALIDATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VALIDATOR_ROLE"));
    const PLANNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PLANNER_ROLE"));

    await registry.grantRole(VALIDATOR_ROLE, validator1.address);
    await registry.grantRole(VALIDATOR_ROLE, validator2.address);
    await registry.grantRole(VALIDATOR_ROLE, validator3.address);
    await registry.grantRole(PLANNER_ROLE, planner.address);
  });

  describe("Project Creation", function () {
    it("Should allow planner to create project", async function () {
      const metadataURI = "ipfs://QmTest123";
      const fundingGoal = ethers.parseEther("10000");

      await registry.connect(planner).createProject(metadataURI, fundingGoal);

      const project = await registry.getProject(1);
      expect(project.planner).to.equal(planner.address);
      expect(project.metadataURI).to.equal(metadataURI);
      expect(project.fundingGoal).to.equal(fundingGoal);
      expect(project.status).to.equal(0); // Pending
    });

    it("Should emit ProjectCreated event", async function () {
      const metadataURI = "ipfs://QmTest123";
      const fundingGoal = ethers.parseEther("10000");

      await expect(registry.connect(planner).createProject(metadataURI, fundingGoal))
        .to.emit(registry, "ProjectCreated");
    });

    it("Should reject empty metadata", async function () {
      await expect(
        registry.connect(planner).createProject("", ethers.parseEther("10000"))
      ).to.be.revertedWith("ProjectRegistry: empty metadata");
    });

    it("Should reject zero funding goal", async function () {
      await expect(
        registry.connect(planner).createProject("ipfs://QmTest", 0)
      ).to.be.revertedWith("ProjectRegistry: zero funding goal");
    });

    it("Should reject creation by non-planner", async function () {
      await expect(
        registry.connect(validator1).createProject("ipfs://QmTest", ethers.parseEther("10000"))
      ).to.be.reverted;
    });
  });

  describe("Project Approval", function () {
    beforeEach(async function () {
      await registry.connect(planner).createProject("ipfs://QmTest", ethers.parseEther("10000"));
    });

    it("Should allow validators to vote", async function () {
      await registry.connect(validator1).voteOnProject(1, true);
      expect(await registry.approvalVotes(1)).to.equal(1);
    });

    it("Should approve project after required votes", async function () {
      await registry.connect(validator1).voteOnProject(1, true);
      await registry.connect(validator2).voteOnProject(1, true);
      await registry.connect(validator3).voteOnProject(1, true);

      const project = await registry.getProject(1);
      expect(project.status).to.equal(1); // Approved
    });

    it("Should reject project on negative vote", async function () {
      await registry.connect(validator1).voteOnProject(1, false);

      const project = await registry.getProject(1);
      expect(project.status).to.equal(2); // Rejected
    });

    it("Should reject double voting", async function () {
      await registry.connect(validator1).voteOnProject(1, true);
      await expect(
        registry.connect(validator1).voteOnProject(1, true)
      ).to.be.revertedWith("ProjectRegistry: already voted");
    });

    it("Should reject votes from non-validators", async function () {
      await expect(registry.connect(planner).voteOnProject(1, true)).to.be.reverted;
    });
  });

  describe("Status Management", function () {
    beforeEach(async function () {
      await registry.connect(planner).createProject("ipfs://QmTest", ethers.parseEther("10000"));
    });

    it("Should allow admin to update status", async function () {
      await registry.updateProjectStatus(1, 4); // Completed

      const project = await registry.getProject(1);
      expect(project.status).to.equal(4);
    });

    it("Should reject status update from non-admin", async function () {
      await expect(registry.connect(planner).updateProjectStatus(1, 4)).to.be.reverted;
    });
  });

  describe("Queries", function () {
    it("Should return project count", async function () {
      await registry.connect(planner).createProject("ipfs://QmTest1", ethers.parseEther("10000"));
      await registry.connect(planner).createProject("ipfs://QmTest2", ethers.parseEther("20000"));

      expect(await registry.getProjectCount()).to.equal(2);
    });

    it("Should reject queries for non-existent projects", async function () {
      await expect(registry.getProject(999)).to.be.revertedWith(
        "ProjectRegistry: project not found"
      );
    });
  });
});
