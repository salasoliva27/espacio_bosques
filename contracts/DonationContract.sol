// contracts/DonationContract.sol

pragma solidity ^0.8.0;

contract DonationContract {
    struct Donation {
        address donor;
        uint amount;
        uint timestamp;
    }

    Donation[] public donations;
    mapping(address => uint) public totalDonations;
    address public projectManager;
    uint public totalFunds;

    constructor(address _projectManager) {
        projectManager = _projectManager;
    }

    function donate() public payable {
        require(msg.value > 0, "Donation must be greater than 0");
        donations.push(Donation(msg.sender, msg.value, block.timestamp));
        totalDonations[msg.sender] += msg.value;
        totalFunds += msg.value;
    }

    function getDonationDetails() public view returns (Donation[] memory) {
        return donations;
    }

    function withdrawFunds(uint amount) public {
        require(msg.sender == projectManager, "Only project manager can withdraw funds");
        require(amount <= totalFunds, "Insufficient funds");
        payable(projectManager).transfer(amount);
        totalFunds -= amount;
    }
}
