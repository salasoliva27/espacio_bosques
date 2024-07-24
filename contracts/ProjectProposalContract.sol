pragma solidity ^0.8.0;

contract ProjectProposalContract {
    struct Proposal {
        uint id;
        string description;
        uint requiredFunds;
        uint votes;
        address proposer;
        bool active;
    }

    Proposal[] public proposals;
    uint public nextProposalId;

    function createProposal(string memory description, uint requiredFunds) public {
        proposals.push(Proposal(nextProposalId, description, requiredFunds, 0, msg.sender, true));
        nextProposalId++;
    }

    function getProposals() public view returns (Proposal[] memory) {
        return proposals;
    }

    function voteProposal(uint proposalId) public {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.active, "Proposal is not active");
        proposal.votes++;
    }
}
