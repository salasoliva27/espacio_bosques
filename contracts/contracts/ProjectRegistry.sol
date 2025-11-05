// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ProjectRegistry
 * @notice Registry for community funding projects
 */
contract ProjectRegistry is AccessControl, ReentrancyGuard {
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant PLANNER_ROLE = keccak256("PLANNER_ROLE");

    enum ProjectStatus {
        Pending,
        Approved,
        Rejected,
        Active,
        Completed,
        Cancelled
    }

    struct Project {
        uint256 id;
        address planner;
        string metadataURI; // IPFS hash with project details
        uint256 fundingGoal;
        uint256 fundingRaised;
        ProjectStatus status;
        uint256 createdAt;
        uint256 approvedAt;
        uint256 completedAt;
        bool exists;
    }

    uint256 private _projectCounter;
    mapping(uint256 => Project) public projects;
    mapping(uint256 => mapping(address => bool)) public validatorVotes;
    mapping(uint256 => uint256) public approvalVotes;

    uint256 public requiredValidatorVotes = 3;

    event ProjectCreated(
        uint256 indexed projectId,
        address indexed planner,
        string metadataURI,
        uint256 fundingGoal,
        uint256 timestamp
    );
    event ProjectApproved(uint256 indexed projectId, uint256 timestamp);
    event ProjectRejected(uint256 indexed projectId, uint256 timestamp);
    event ProjectStatusChanged(uint256 indexed projectId, ProjectStatus newStatus);
    event ValidatorVoteCast(uint256 indexed projectId, address indexed validator, bool approved);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VALIDATOR_ROLE, msg.sender);
    }

    /**
     * @notice Create a new project
     * @param metadataURI IPFS URI with project metadata
     * @param fundingGoal Funding goal in tokens
     */
    function createProject(
        string calldata metadataURI,
        uint256 fundingGoal
    ) external onlyRole(PLANNER_ROLE) returns (uint256) {
        require(bytes(metadataURI).length > 0, "ProjectRegistry: empty metadata");
        require(fundingGoal > 0, "ProjectRegistry: zero funding goal");

        uint256 projectId = ++_projectCounter;

        projects[projectId] = Project({
            id: projectId,
            planner: msg.sender,
            metadataURI: metadataURI,
            fundingGoal: fundingGoal,
            fundingRaised: 0,
            status: ProjectStatus.Pending,
            createdAt: block.timestamp,
            approvedAt: 0,
            completedAt: 0,
            exists: true
        });

        emit ProjectCreated(projectId, msg.sender, metadataURI, fundingGoal, block.timestamp);

        return projectId;
    }

    /**
     * @notice Validator votes on project approval
     * @param projectId Project ID
     * @param approved Approval decision
     */
    function voteOnProject(uint256 projectId, bool approved) external onlyRole(VALIDATOR_ROLE) {
        require(projects[projectId].exists, "ProjectRegistry: project not found");
        require(projects[projectId].status == ProjectStatus.Pending, "ProjectRegistry: not pending");
        require(!validatorVotes[projectId][msg.sender], "ProjectRegistry: already voted");

        validatorVotes[projectId][msg.sender] = true;

        if (approved) {
            approvalVotes[projectId]++;

            if (approvalVotes[projectId] >= requiredValidatorVotes) {
                projects[projectId].status = ProjectStatus.Approved;
                projects[projectId].approvedAt = block.timestamp;
                emit ProjectApproved(projectId, block.timestamp);
            }
        } else {
            projects[projectId].status = ProjectStatus.Rejected;
            emit ProjectRejected(projectId, block.timestamp);
        }

        emit ValidatorVoteCast(projectId, msg.sender, approved);
    }

    /**
     * @notice Update project status
     * @param projectId Project ID
     * @param newStatus New status
     */
    function updateProjectStatus(
        uint256 projectId,
        ProjectStatus newStatus
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(projects[projectId].exists, "ProjectRegistry: project not found");
        projects[projectId].status = newStatus;

        if (newStatus == ProjectStatus.Completed) {
            projects[projectId].completedAt = block.timestamp;
        }

        emit ProjectStatusChanged(projectId, newStatus);
    }

    /**
     * @notice Update funding raised (called by EscrowVault)
     * @param projectId Project ID
     * @param amount Amount raised
     */
    function updateFundingRaised(
        uint256 projectId,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(projects[projectId].exists, "ProjectRegistry: project not found");
        projects[projectId].fundingRaised = amount;
    }

    /**
     * @notice Get project details
     * @param projectId Project ID
     */
    function getProject(uint256 projectId) external view returns (Project memory) {
        require(projects[projectId].exists, "ProjectRegistry: project not found");
        return projects[projectId];
    }

    /**
     * @notice Get total number of projects
     */
    function getProjectCount() external view returns (uint256) {
        return _projectCounter;
    }

    /**
     * @notice Set required validator votes
     * @param votes Number of required votes
     */
    function setRequiredValidatorVotes(uint256 votes) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(votes > 0, "ProjectRegistry: invalid votes");
        requiredValidatorVotes = votes;
    }
}
