// test/VotingContract.js

const { expect } = require("chai");

describe("VotingContract", function () {
    let Voting;
    let voting;
    let owner;
    let addr1;

    beforeEach(async function () {
        Voting = await ethers.getContractFactory("VotingContract");
        [owner, addr1, _] = await ethers.getSigners();
        voting = await Voting.deploy();
        await voting.deployed();
    });

    it("Should record votes correctly", async function () {
        await voting.connect(addr1).voteProposal(1);
        const voteCount = await voting.getVotingResults(1);
        expect(voteCount).to.equal(1);
    });
});
