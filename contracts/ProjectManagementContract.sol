pragma solidity ^0.8.0;

contract ProjectManagementContract {
    struct Project {
        uint id;
        string description;
        uint allocatedFunds;
        uint spentFunds;
        address manager;
        bool active;
        bool completed;
    }

    Project[] public projects;
    uint public nextProjectId;

    function startProject(string memory description, uint allocatedFunds) public {
        projects.push(Project(nextProjectId, description, allocatedFunds, 0, msg.sender, true, false));
        nextProjectId++;
    }

    function updateProjectStatus(uint projectId, uint spentFunds) public {
        Project storage project = projects[projectId];
        require(msg.sender == project.manager, "Only project manager can update status");
        project.spentFunds += spentFunds;
    }

    function completeProject(uint projectId) public {
        Project storage project = projects[projectId];
        require(msg.sender == project.manager, "Only project manager can complete the project");
        project.completed = true;
    }
}
