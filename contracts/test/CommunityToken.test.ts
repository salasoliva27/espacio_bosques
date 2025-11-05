import { expect } from "chai";
import { ethers } from "hardhat";
import { CommunityToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("CommunityToken", function () {
  let token: CommunityToken;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  const INITIAL_SUPPLY = 1000000;
  const DECIMALS = 18;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const CommunityToken = await ethers.getContractFactory("CommunityToken");
    token = await CommunityToken.deploy(
      "Bosques Community Token",
      "BOSQUES",
      DECIMALS,
      INITIAL_SUPPLY,
      owner.address
    );
  });

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      expect(await token.name()).to.equal("Bosques Community Token");
      expect(await token.symbol()).to.equal("BOSQUES");
    });

    it("Should set the right decimals", async function () {
      expect(await token.decimals()).to.equal(DECIMALS);
    });

    it("Should mint initial supply to owner", async function () {
      const expectedSupply = ethers.parseUnits(INITIAL_SUPPLY.toString(), DECIMALS);
      expect(await token.balanceOf(owner.address)).to.equal(expectedSupply);
    });

    it("Should grant DEFAULT_ADMIN_ROLE and MINTER_ROLE to deployer", async function () {
      const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
      const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));

      expect(await token.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
      expect(await token.hasRole(MINTER_ROLE, owner.address)).to.be.true;
    });

    it("Should reject zero address as initial holder", async function () {
      const CommunityToken = await ethers.getContractFactory("CommunityToken");
      await expect(
        CommunityToken.deploy("Bosques", "BOSQUES", 18, 1000000, ethers.ZeroAddress)
      ).to.be.revertedWith("CommunityToken: zero address");
    });
  });

  describe("Minting", function () {
    it("Should allow minter to mint tokens", async function () {
      const amount = ethers.parseEther("1000");
      await token.mint(addr1.address, amount);
      expect(await token.balanceOf(addr1.address)).to.equal(amount);
    });

    it("Should emit TokensMinted event", async function () {
      const amount = ethers.parseEther("1000");
      await expect(token.mint(addr1.address, amount))
        .to.emit(token, "TokensMinted")
        .withArgs(addr1.address, amount);
    });

    it("Should reject minting by non-minter", async function () {
      const amount = ethers.parseEther("1000");
      await expect(
        token.connect(addr1).mint(addr2.address, amount)
      ).to.be.reverted;
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      const amount = ethers.parseEther("1000");
      await token.transfer(addr1.address, amount);
    });

    it("Should allow users to burn their tokens", async function () {
      const burnAmount = ethers.parseEther("100");
      const initialBalance = await token.balanceOf(addr1.address);

      await token.connect(addr1).burn(burnAmount);

      expect(await token.balanceOf(addr1.address)).to.equal(
        initialBalance - burnAmount
      );
    });

    it("Should emit TokensBurned event", async function () {
      const burnAmount = ethers.parseEther("100");
      await expect(token.connect(addr1).burn(burnAmount))
        .to.emit(token, "TokensBurned")
        .withArgs(addr1.address, burnAmount);
    });

    it("Should reject burning more than balance", async function () {
      const burnAmount = ethers.parseEther("10000");
      await expect(token.connect(addr1).burn(burnAmount)).to.be.reverted;
    });
  });

  describe("Transfer", function () {
    it("Should transfer tokens between accounts", async function () {
      const amount = ethers.parseEther("100");
      await token.transfer(addr1.address, amount);
      expect(await token.balanceOf(addr1.address)).to.equal(amount);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const initialOwnerBalance = await token.balanceOf(owner.address);
      await expect(
        token.connect(addr1).transfer(owner.address, 1)
      ).to.be.reverted;
    });
  });
});
