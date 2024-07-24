// test/DonationContract.js

const { expect } = require("chai");

describe("DonationContract", function () {
  let DonationContract;
  let donationContract;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    DonationContract = await ethers.getContractFactory("DonationContract");
    [owner, addr1, addr2, _] = await ethers.getSigners();
    donationContract = await DonationContract.deploy(owner.address);
    await donationContract.deployed();
  });

  it("Should accept donations and record them", async function () {
    await donationContract.connect(addr1).donate({ value: ethers.utils.parseEther("1") });
    await donationContract.connect(addr2).donate({ value: ethers.utils.parseEther("2") });

    const donations = await donationContract.getDonationDetails();

    expect(donations.length).to.equal(2);
    expect(donations[0].amount).to.equal(ethers.utils.parseEther("1"));
    expect(donations[1].amount).to.equal(ethers.utils.parseEther("2"));
  });

  it("Should allow the project manager to withdraw funds", async function () {
    await donationContract.connect(addr1).donate({ value: ethers.utils.parseEther("1") });

    await expect(() =>
      donationContract.connect(owner).withdrawFunds(ethers.utils.parseEther("1"))
    ).to.changeEtherBalance(owner, ethers.utils.parseEther("1"));
  });

  it("Should not allow non-managers to withdraw funds", async function () {
    await donationContract.connect(addr1).donate({ value: ethers.utils.parseEther("1") });

    await expect(
      donationContract.connect(addr1).withdrawFunds(ethers.utils.parseEther("1"))
    ).to.be.revertedWith("Only project manager can withdraw funds");
  });
});
