// test/AuditContract.js

const { expect } = require("chai");

describe("AuditContract", function () {
    let Audit;
    let audit;
    let owner;
    let addr1;

    beforeEach(async function () {
        Audit = await ethers.getContractFactory("AuditContract");
        [owner, addr1, _] = await ethers.getSigners();
        audit = await Audit.deploy();
        await audit.deployed();
    });

    it("Should allow auditors to submit and retrieve audit reports", async function () {
        await audit.connect(addr1).submitReport(0, "Initial Audit Completed");
        const reports = await audit.getAuditReports(0);
        expect(reports.length).to.equal(1);
        expect(reports[0].report).to.equal("Initial Audit Completed");
    });
});
