// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title MilestoneManager
 * @notice Manages project milestones and submissions
 */
contract MilestoneManager is AccessControl {
    bytes32 public constant PLANNER_ROLE = keccak256("PLANNER_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");

    enum MilestoneStatus {
        Pending,
        InProgress,
        Submitted,
        Approved,
        Rejected,
        Completed
    }

    struct Milestone {
        uint256 id;
        uint256 projectId;
        string title;
        string description;
        uint256 fundingPercentage; // Percentage of total project funding
        uint256 durationDays;
        MilestoneStatus status;
        uint256 createdAt;
        uint256 submittedAt;
        uint256 completedAt;
        string evidenceURI; // IPFS hash with evidence
        bool exists;
    }

    uint256 private _milestoneCounter;
    mapping(uint256 => Milestone) public milestones;
    mapping(uint256 => uint256[]) public projectMilestones; // projectId => milestoneIds
    mapping(uint256 => mapping(address => bool)) public validationVotes;
    mapping(uint256 => uint256) public approvalVotes;

    uint256 public requiredValidatorVotes = 2;

    event MilestoneCreated(
        uint256 indexed milestoneId,
        uint256 indexed projectId,
        string title,
        uint256 fundingPercentage,
        uint256 timestamp
    );
    event MilestoneSubmitted(
        uint256 indexed milestoneId,
        string evidenceURI,
        uint256 timestamp
    );
    event MilestoneStatusChanged(
        uint256 indexed milestoneId,
        MilestoneStatus newStatus
    );
    event ValidationVoteCast(
        uint256 indexed milestoneId,
        address indexed validator,
        bool approved
    );

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VALIDATOR_ROLE, msg.sender);
    }

    /**
     * @notice Create a milestone
     * @param projectId Project ID
     * @param title Milestone title
     * @param description Milestone description
     * @param fundingPercentage Percentage of project funding (0-100)
     * @param durationDays Duration in days
     */
    function createMilestone(
        uint256 projectId,
        string calldata title,
        string calldata description,
        uint256 fundingPercentage,
        uint256 durationDays
    ) external onlyRole(DEFAULT_ADMIN_ROLE) returns (uint256) {
        require(bytes(title).length > 0, "MilestoneManager: empty title");
        require(fundingPercentage > 0 && fundingPercentage <= 100, "MilestoneManager: invalid percentage");
        require(durationDays > 0, "MilestoneManager: invalid duration");

        uint256 milestoneId = ++_milestoneCounter;

        milestones[milestoneId] = Milestone({
            id: milestoneId,
            projectId: projectId,
            title: title,
            description: description,
            fundingPercentage: fundingPercentage,
            durationDays: durationDays,
            status: MilestoneStatus.Pending,
            createdAt: block.timestamp,
            submittedAt: 0,
            completedAt: 0,
            evidenceURI: "",
            exists: true
        });

        projectMilestones[projectId].push(milestoneId);

        emit MilestoneCreated(
            milestoneId,
            projectId,
            title,
            fundingPercentage,
            block.timestamp
        );

        return milestoneId;
    }

    /**
     * @notice Submit milestone evidence
     * @param milestoneId Milestone ID
     * @param evidenceURI IPFS URI with evidence
     */
    function submitMilestone(
        uint256 milestoneId,
        string calldata evidenceURI
    ) external onlyRole(PLANNER_ROLE) {
        require(milestones[milestoneId].exists, "MilestoneManager: not found");
        require(
            milestones[milestoneId].status == MilestoneStatus.InProgress,
            "MilestoneManager: not in progress"
        );
        require(bytes(evidenceURI).length > 0, "MilestoneManager: empty evidence");

        milestones[milestoneId].status = MilestoneStatus.Submitted;
        milestones[milestoneId].evidenceURI = evidenceURI;
        milestones[milestoneId].submittedAt = block.timestamp;

        emit MilestoneSubmitted(milestoneId, evidenceURI, block.timestamp);
    }

    /**
     * @notice Validator votes on milestone completion
     * @param milestoneId Milestone ID
     * @param approved Approval decision
     */
    function validateMilestone(
        uint256 milestoneId,
        bool approved
    ) external onlyRole(VALIDATOR_ROLE) {
        require(milestones[milestoneId].exists, "MilestoneManager: not found");
        require(
            milestones[milestoneId].status == MilestoneStatus.Submitted,
            "MilestoneManager: not submitted"
        );
        require(!validationVotes[milestoneId][msg.sender], "MilestoneManager: already voted");

        validationVotes[milestoneId][msg.sender] = true;

        if (approved) {
            approvalVotes[milestoneId]++;

            if (approvalVotes[milestoneId] >= requiredValidatorVotes) {
                milestones[milestoneId].status = MilestoneStatus.Approved;
                milestones[milestoneId].completedAt = block.timestamp;
                emit MilestoneStatusChanged(milestoneId, MilestoneStatus.Approved);
            }
        } else {
            milestones[milestoneId].status = MilestoneStatus.Rejected;
            emit MilestoneStatusChanged(milestoneId, MilestoneStatus.Rejected);
        }

        emit ValidationVoteCast(milestoneId, msg.sender, approved);
    }

    /**
     * @notice Update milestone status
     * @param milestoneId Milestone ID
     * @param newStatus New status
     */
    function updateMilestoneStatus(
        uint256 milestoneId,
        MilestoneStatus newStatus
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(milestones[milestoneId].exists, "MilestoneManager: not found");
        milestones[milestoneId].status = newStatus;

        if (newStatus == MilestoneStatus.Completed) {
            milestones[milestoneId].completedAt = block.timestamp;
        }

        emit MilestoneStatusChanged(milestoneId, newStatus);
    }

    /**
     * @notice Get milestone details
     * @param milestoneId Milestone ID
     */
    function getMilestone(uint256 milestoneId) external view returns (Milestone memory) {
        require(milestones[milestoneId].exists, "MilestoneManager: not found");
        return milestones[milestoneId];
    }

    /**
     * @notice Get all milestones for a project
     * @param projectId Project ID
     */
    function getProjectMilestones(uint256 projectId) external view returns (uint256[] memory) {
        return projectMilestones[projectId];
    }

    /**
     * @notice Get milestone count for project
     * @param projectId Project ID
     */
    function getProjectMilestoneCount(uint256 projectId) external view returns (uint256) {
        return projectMilestones[projectId].length;
    }

    /**
     * @notice Set required validator votes
     * @param votes Number of required votes
     */
    function setRequiredValidatorVotes(uint256 votes) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(votes > 0, "MilestoneManager: invalid votes");
        requiredValidatorVotes = votes;
    }
}
