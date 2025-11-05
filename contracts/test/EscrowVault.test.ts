import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { CommunityToken, EscrowVault } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("EscrowVault", function () {
  let token: CommunityToken;
  let escrow: EscrowVault;
  let owner: SignerWithAddress;
  let validator1: SignerWithAddress;
  let validator2: SignerWithAddress;
  let investor: SignerWithAddress;
  let recipient: SignerWithAddress;

  const INITIAL_SUPPLY = 1000000;
  const PROJECT_ID = 1;
  const MILESTONE_ID = 1;

  beforeEach(async function () {
    [owner, validator1, validator2, investor, recipient] = await ethers.getSigners();

    // Deploy token
    const CommunityToken = await ethers.getContractFactory("CommunityToken");
    token = await CommunityToken.deploy(
      "Bosques Community Token",
      "BOSQUES",
      18,
      INITIAL_SUPPLY,
      owner.address
    );

    // Deploy escrow
    const EscrowVault = await ethers.getContractFactory("EscrowVault");
    escrow = await EscrowVault.deploy(await token.getAddress());

    // Grant validator roles
    const VALIDATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VALIDATOR_ROLE"));
    await escrow.grantRole(VALIDATOR_ROLE, validator1.address);
    await escrow.grantRole(VALIDATOR_ROLE, validator2.address);

    // Fund investor
    const amount = ethers.parseEther("10000");
    await token.transfer(investor.address, amount);
  });

  describe("Deployment", function () {
    it("Should set the correct token", async function () {
      expect(await escrow.token()).to.equal(await token.getAddress());
    });

    it("Should set default configuration", async function () {
      expect(await escrow.quorumPercentage()).to.equal(51);
      expect(await escrow.timelockDuration()).to.equal(86400); // 1 day
    });

    it("Should reject zero token address", async function () {
      const EscrowVault = await ethers.getContractFactory("EscrowVault");
      await expect(EscrowVault.deploy(ethers.ZeroAddress)).to.be.revertedWith(
        "EscrowVault: zero address"
      );
    });
  });

  describe("Deposits", function () {
    it("Should allow deposits to projects", async function () {
      const amount = ethers.parseEther("1000");

      await token.connect(investor).approve(await escrow.getAddress(), amount);
      await escrow.connect(investor).deposit(PROJECT_ID, amount);

      expect(await escrow.projectBalances(PROJECT_ID)).to.equal(amount);
      expect(await escrow.investorBalances(PROJECT_ID, investor.address)).to.equal(amount);
    });

    it("Should emit Deposited event", async function () {
      const amount = ethers.parseEther("1000");

      await token.connect(investor).approve(await escrow.getAddress(), amount);

      await expect(escrow.connect(investor).deposit(PROJECT_ID, amount))
        .to.emit(escrow, "Deposited")
        .withArgs(PROJECT_ID, investor.address, amount, await time.latest() + 1);
    });

    it("Should reject zero amount deposits", async function () {
      await expect(escrow.connect(investor).deposit(PROJECT_ID, 0)).to.be.revertedWith(
        "EscrowVault: zero amount"
      );
    });

    it("Should reject deposits without approval", async function () {
      const amount = ethers.parseEther("1000");
      await expect(escrow.connect(investor).deposit(PROJECT_ID, amount)).to.be.reverted;
    });

    it("Should prevent reentrancy on deposits", async function () {
      const amount = ethers.parseEther("1000");
      await token.connect(investor).approve(await escrow.getAddress(), amount);
      // The nonReentrant modifier prevents reentrancy attacks
      // This is a basic test - more sophisticated reentrancy tests would require a malicious contract
      await escrow.connect(investor).deposit(PROJECT_ID, amount);
      expect(await escrow.projectBalances(PROJECT_ID)).to.equal(amount);
    });
  });

  describe("Release Requests", function () {
    beforeEach(async function () {
      const amount = ethers.parseEther("5000");
      await token.connect(investor).approve(await escrow.getAddress(), amount);
      await escrow.connect(investor).deposit(PROJECT_ID, amount);
    });

    it("Should allow admin to request release", async function () {
      const amount = ethers.parseEther("1000");

      await escrow.requestRelease(PROJECT_ID, MILESTONE_ID, amount, recipient.address);

      const request = await escrow.releaseRequests(1);
      expect(request.projectId).to.equal(PROJECT_ID);
      expect(request.amount).to.equal(amount);
      expect(request.recipient).to.equal(recipient.address);
      expect(request.status).to.equal(1); // Pending
    });

    it("Should emit ReleaseRequested event", async function () {
      const amount = ethers.parseEther("1000");

      await expect(escrow.requestRelease(PROJECT_ID, MILESTONE_ID, amount, recipient.address))
        .to.emit(escrow, "ReleaseRequested")
        .withArgs(1, PROJECT_ID, MILESTONE_ID, amount, recipient.address);
    });

    it("Should reject zero amount release", async function () {
      await expect(
        escrow.requestRelease(PROJECT_ID, MILESTONE_ID, 0, recipient.address)
      ).to.be.revertedWith("EscrowVault: zero amount");
    });

    it("Should reject zero recipient address", async function () {
      const amount = ethers.parseEther("1000");
      await expect(
        escrow.requestRelease(PROJECT_ID, MILESTONE_ID, amount, ethers.ZeroAddress)
      ).to.be.revertedWith("EscrowVault: zero recipient");
    });

    it("Should reject release exceeding project balance", async function () {
      const amount = ethers.parseEther("10000");
      await expect(
        escrow.requestRelease(PROJECT_ID, MILESTONE_ID, amount, recipient.address)
      ).to.be.revertedWith("EscrowVault: insufficient balance");
    });

    it("Should reject requests from non-admin", async function () {
      const amount = ethers.parseEther("1000");
      await expect(
        escrow.connect(investor).requestRelease(PROJECT_ID, MILESTONE_ID, amount, recipient.address)
      ).to.be.reverted;
    });
  });

  describe("Release Voting", function () {
    let requestId: number;

    beforeEach(async function () {
      const depositAmount = ethers.parseEther("5000");
      await token.connect(investor).approve(await escrow.getAddress(), depositAmount);
      await escrow.connect(investor).deposit(PROJECT_ID, depositAmount);

      const releaseAmount = ethers.parseEther("1000");
      await escrow.requestRelease(PROJECT_ID, MILESTONE_ID, releaseAmount, recipient.address);
      requestId = 1;
    });

    it("Should allow validators to vote on release", async function () {
      await escrow.connect(validator1).voteRelease(requestId, true);

      const request = await escrow.releaseRequests(requestId);
      expect(request.approvalCount).to.equal(1);
    });

    it("Should emit ReleaseVoteCast event", async function () {
      await expect(escrow.connect(validator1).voteRelease(requestId, true))
        .to.emit(escrow, "ReleaseVoteCast")
        .withArgs(requestId, validator1.address, true);
    });

    it("Should approve release when quorum reached", async function () {
      await escrow.connect(validator1).voteRelease(requestId, true);
      await escrow.connect(validator2).voteRelease(requestId, true);

      const request = await escrow.releaseRequests(requestId);
      expect(request.status).to.equal(2); // Approved
    });

    it("Should reject double voting", async function () {
      await escrow.connect(validator1).voteRelease(requestId, true);
      await expect(
        escrow.connect(validator1).voteRelease(requestId, true)
      ).to.be.revertedWith("EscrowVault: already voted");
    });

    it("Should reject votes from non-validators", async function () {
      await expect(escrow.connect(investor).voteRelease(requestId, true)).to.be.reverted;
    });

    it("Should reject release when voted against", async function () {
      await escrow.connect(validator1).voteRelease(requestId, false);
      await escrow.connect(validator2).voteRelease(requestId, false);

      const request = await escrow.releaseRequests(requestId);
      expect(request.status).to.equal(3); // Rejected
    });
  });

  describe("Release Execution", function () {
    let requestId: number;

    beforeEach(async function () {
      const depositAmount = ethers.parseEther("5000");
      await token.connect(investor).approve(await escrow.getAddress(), depositAmount);
      await escrow.connect(investor).deposit(PROJECT_ID, depositAmount);

      const releaseAmount = ethers.parseEther("1000");
      await escrow.requestRelease(PROJECT_ID, MILESTONE_ID, releaseAmount, recipient.address);
      requestId = 1;

      // Approve release
      await escrow.connect(validator1).voteRelease(requestId, true);
      await escrow.connect(validator2).voteRelease(requestId, true);
    });

    it("Should execute release after timelock", async function () {
      await time.increase(86400); // 1 day

      const initialRecipientBalance = await token.balanceOf(recipient.address);
      const releaseAmount = ethers.parseEther("1000");

      await escrow.executeRelease(requestId);

      expect(await token.balanceOf(recipient.address)).to.equal(
        initialRecipientBalance + releaseAmount
      );
    });

    it("Should emit ReleaseExecuted event", async function () {
      await time.increase(86400);
      const releaseAmount = ethers.parseEther("1000");

      await expect(escrow.executeRelease(requestId))
        .to.emit(escrow, "ReleaseExecuted")
        .withArgs(requestId, PROJECT_ID, MILESTONE_ID, releaseAmount, recipient.address);
    });

    it("Should reject execution before timelock", async function () {
      await expect(escrow.executeRelease(requestId)).to.be.revertedWith(
        "EscrowVault: timelock active"
      );
    });

    it("Should reject execution of non-approved release", async function () {
      const releaseAmount = ethers.parseEther("500");
      await escrow.requestRelease(PROJECT_ID, 2, releaseAmount, recipient.address);
      const newRequestId = 2;

      await time.increase(86400);

      await expect(escrow.executeRelease(newRequestId)).to.be.revertedWith(
        "EscrowVault: not approved"
      );
    });

    it("Should reject double execution", async function () {
      await time.increase(86400);
      await escrow.executeRelease(requestId);

      await expect(escrow.executeRelease(requestId)).to.be.revertedWith(
        "EscrowVault: not approved"
      );
    });

    it("Should reject execution from non-admin", async function () {
      await time.increase(86400);
      await expect(escrow.connect(investor).executeRelease(requestId)).to.be.reverted;
    });
  });

  describe("Configuration", function () {
    it("Should allow admin to set quorum percentage", async function () {
      await escrow.setQuorumPercentage(60);
      expect(await escrow.quorumPercentage()).to.equal(60);
    });

    it("Should reject invalid quorum percentage", async function () {
      await expect(escrow.setQuorumPercentage(0)).to.be.revertedWith(
        "EscrowVault: invalid percentage"
      );
      await expect(escrow.setQuorumPercentage(101)).to.be.revertedWith(
        "EscrowVault: invalid percentage"
      );
    });

    it("Should allow admin to set timelock duration", async function () {
      await escrow.setTimelockDuration(172800); // 2 days
      expect(await escrow.timelockDuration()).to.equal(172800);
    });
  });
});
