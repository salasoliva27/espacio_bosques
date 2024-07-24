// test/ProjectManagementContract.js

const { expect } = require("chai");

describe("ProjectManagementContract", function () {
    let ProjectManagement;
    let projectManagement;
    let owner;
    let addr1;

    beforeEach(async function () {
        ProjectManagement = await ethers.getContractFactory("ProjectManagementContract");
        [owner, addr1, _] = await ethers.getSigners();
        projectManagement = await ProjectManagement.deploy();
        await projectManagement.deployed();
    });

    it("Should allow project managers to start and complete a project", async function () {
        await projectManagement.connect(owner).startProject("Community Library", 5000);
        await projectManagement.connect(owner).completeProject(0);
        const project = await projectManagement.projects(0);
        expect(project.completed).to.be.true;
    });
});
