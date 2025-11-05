// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title CommunityToken
 * @notice ERC20 token for Espacio Bosques DAO (BOSQUES)
 * @dev Mock token for testing. In production, replace with real stablecoin integration.
 */
contract CommunityToken is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint8 private _decimals;

    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);

    /**
     * @notice Constructor
     * @param name_ Token name
     * @param symbol_ Token symbol
     * @param decimals_ Token decimals
     * @param initialSupply_ Initial supply (in whole tokens)
     * @param initialHolder_ Address to receive initial supply
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 initialSupply_,
        address initialHolder_
    ) ERC20(name_, symbol_) {
        require(initialHolder_ != address(0), "CommunityToken: zero address");

        _decimals = decimals_;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);

        // Mint initial supply
        _mint(initialHolder_, initialSupply_ * 10 ** decimals_);
    }

    /**
     * @notice Override decimals
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @notice Mint new tokens (for testing purposes)
     * @param to Recipient address
     * @param amount Amount to mint (in smallest unit)
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @notice Burn tokens from caller
     * @param amount Amount to burn
     */
    function burn(uint256 amount) public virtual override {
        super.burn(amount);
        emit TokensBurned(msg.sender, amount);
    }
}
