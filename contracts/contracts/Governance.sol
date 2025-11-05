// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Governance
 * @notice Basic governance for role management and configuration
 * @dev Simplified governance - can be extended with token voting, proposals, etc.
 */
contract Governance is AccessControl {
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant PLANNER_ROLE = keccak256("PLANNER_ROLE");

    IERC20 public immutable token;

    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        bytes callData;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        bool exists;
    }

    uint256 private _proposalCounter;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    uint256 public votingPeriod = 7 days;
    uint256 public proposalThreshold = 1000 * 10 ** 18; // 1000 tokens

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string description,
        uint256 startTime,
        uint256 endTime
    );
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 weight
    );
    event ProposalExecuted(uint256 indexed proposalId);
    event RoleGrantedByGovernance(bytes32 indexed role, address indexed account);
    event RoleRevokedByGovernance(bytes32 indexed role, address indexed account);

    /**
     * @notice Constructor
     * @param tokenAddress Governance token address
     */
    constructor(address tokenAddress) {
        require(tokenAddress != address(0), "Governance: zero address");
        token = IERC20(tokenAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @notice Create a governance proposal
     * @param description Proposal description
     * @param callData Encoded function call data
     */
    function createProposal(
        string calldata description,
        bytes calldata callData
    ) external returns (uint256) {
        require(
            token.balanceOf(msg.sender) >= proposalThreshold,
            "Governance: insufficient tokens"
        );
        require(bytes(description).length > 0, "Governance: empty description");

        uint256 proposalId = ++_proposalCounter;
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + votingPeriod;

        proposals[proposalId] = Proposal({
            id: proposalId,
            proposer: msg.sender,
            description: description,
            callData: callData,
            forVotes: 0,
            againstVotes: 0,
            startTime: startTime,
            endTime: endTime,
            executed: false,
            exists: true
        });

        emit ProposalCreated(proposalId, msg.sender, description, startTime, endTime);

        return proposalId;
    }

    /**
     * @notice Vote on a proposal
     * @param proposalId Proposal ID
     * @param support True for support, false for against
     */
    function vote(uint256 proposalId, bool support) external {
        require(proposals[proposalId].exists, "Governance: proposal not found");
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp >= proposal.startTime, "Governance: voting not started");
        require(block.timestamp <= proposal.endTime, "Governance: voting ended");
        require(!hasVoted[proposalId][msg.sender], "Governance: already voted");

        uint256 weight = token.balanceOf(msg.sender);
        require(weight > 0, "Governance: no voting power");

        hasVoted[proposalId][msg.sender] = true;

        if (support) {
            proposal.forVotes += weight;
        } else {
            proposal.againstVotes += weight;
        }

        emit VoteCast(proposalId, msg.sender, support, weight);
    }

    /**
     * @notice Execute a passed proposal
     * @param proposalId Proposal ID
     */
    function executeProposal(uint256 proposalId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(proposals[proposalId].exists, "Governance: proposal not found");
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp > proposal.endTime, "Governance: voting not ended");
        require(!proposal.executed, "Governance: already executed");
        require(proposal.forVotes > proposal.againstVotes, "Governance: proposal failed");

        proposal.executed = true;

        // In a real implementation, would execute the callData here
        // For now, just emit event
        emit ProposalExecuted(proposalId);
    }

    /**
     * @notice Grant VALIDATOR_ROLE to an address
     * @param account Address to grant role
     */
    function addValidator(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(VALIDATOR_ROLE, account);
        emit RoleGrantedByGovernance(VALIDATOR_ROLE, account);
    }

    /**
     * @notice Revoke VALIDATOR_ROLE from an address
     * @param account Address to revoke role
     */
    function removeValidator(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(VALIDATOR_ROLE, account);
        emit RoleRevokedByGovernance(VALIDATOR_ROLE, account);
    }

    /**
     * @notice Grant PLANNER_ROLE to an address
     * @param account Address to grant role
     */
    function addPlanner(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(PLANNER_ROLE, account);
        emit RoleGrantedByGovernance(PLANNER_ROLE, account);
    }

    /**
     * @notice Revoke PLANNER_ROLE from an address
     * @param account Address to revoke role
     */
    function removePlanner(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(PLANNER_ROLE, account);
        emit RoleRevokedByGovernance(PLANNER_ROLE, account);
    }

    /**
     * @notice Set voting period
     * @param period New voting period in seconds
     */
    function setVotingPeriod(uint256 period) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(period > 0, "Governance: invalid period");
        votingPeriod = period;
    }

    /**
     * @notice Set proposal threshold
     * @param threshold New proposal threshold
     */
    function setProposalThreshold(uint256 threshold) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(threshold > 0, "Governance: invalid threshold");
        proposalThreshold = threshold;
    }

    /**
     * @notice Get proposal details
     * @param proposalId Proposal ID
     */
    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        require(proposals[proposalId].exists, "Governance: proposal not found");
        return proposals[proposalId];
    }
}
