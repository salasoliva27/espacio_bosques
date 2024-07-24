pragma solidity ^0.8.0;

contract VotingContract {
    struct Vote {
        address voter;
        uint proposalId;
    }

    Vote[] public votes;
    mapping(uint => uint) public proposalVotes;

    function voteProposal(uint proposalId) public {
        votes.push(Vote(msg.sender, proposalId));
        proposalVotes[proposalId]++;
    }

    function getVotingResults(uint proposalId) public view returns (uint) {
        return proposalVotes[proposalId];
    }

    function finalizeVote(uint proposalId) public {
        // Logic to finalize the vote and allocate funds
    }
}
