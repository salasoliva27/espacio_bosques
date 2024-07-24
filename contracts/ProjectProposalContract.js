// test/ProjectProposalContract.js

const { expect } = require("chai");

describe("ProjectProposalContract", function () {
    let ProjectProposal;
    let projectProposal;
    let owner;
    let addr1;

    beforeEach(async function () {
        ProjectProposal = await ethers.getContractFactory("ProjectProposalContract");
        [owner, addr1, _] = await ethers.getSigners();
        projectProposal = await ProjectProposal.deploy();
        await projectProposal.deployed();
    });

    it("Should allow users to create a proposal", async function () {
        await projectProposal.connect(addr1).createProposal("Build a new park", 1000);
        const proposals = await projectProposal.getProposals();
        expect(proposals.length).to.equal(1);
        expect(proposals[0].description).to.equal("Build a new park");
        expect(proposals[0].requiredFunds).to.equal(1000);
    });

    it("Should allow users to vote on a proposal", async function () {
        await projectProposal.connect(addr1).createProposal("Build a new school", 2000);
        await projectProposal.connect(addr1).voteProposal(0);
        const proposals = await projectProposal.getProposals();
        expect(proposals[0].votes).to.equal(1);
    });
});
