// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LilyPadToken
 * @dev ERC20 Governance token for The Lily Pad DAO
 * 
 * Features:
 * - ERC20 with EIP-712 permit for gasless approvals
 * - ERC20Votes for on-chain voting power tracking
 * - Checkpoint system for historical vote snapshots
 * - Owner-controlled minting for treasury operations
 * 
 * Token Distribution:
 * - Team (15%): 15,000,000 LILY
 * - Treasury (35%): 35,000,000 LILY
 * - Community Airdrops (25%): 25,000,000 LILY
 * - Liquidity (25%): 25,000,000 LILY
 */
contract LilyPadToken is ERC20, ERC20Permit, ERC20Votes, Ownable {
    /// @notice Maximum supply cap: 100 million tokens
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10**18;
    
    /// @notice Tracks total minted to enforce cap
    uint256 public totalMinted;

    /// @notice Emitted when tokens are minted
    event TokensMinted(address indexed to, uint256 amount, string reason);

    /// @notice Emitted when ownership is transferred
    event GovernanceOwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Constructor mints initial supply to deployer
     * @param initialOwner The address that will own the contract and receive initial supply
     * @param treasuryAddress The address to receive treasury allocation
     * @param teamAddress The address to receive team allocation
     */
    constructor(
        address initialOwner,
        address treasuryAddress,
        address teamAddress
    ) 
        ERC20("LilyPad Governance", "LILY") 
        ERC20Permit("LilyPad Governance")
        Ownable(initialOwner)
    {
        require(treasuryAddress != address(0), "Treasury address cannot be zero");
        require(teamAddress != address(0), "Team address cannot be zero");

        // Treasury allocation: 35%
        uint256 treasuryAmount = 35_000_000 * 10**18;
        _mint(treasuryAddress, treasuryAmount);
        totalMinted += treasuryAmount;
        emit TokensMinted(treasuryAddress, treasuryAmount, "Treasury allocation");

        // Team allocation: 15%
        uint256 teamAmount = 15_000_000 * 10**18;
        _mint(teamAddress, teamAmount);
        totalMinted += teamAmount;
        emit TokensMinted(teamAddress, teamAmount, "Team allocation");

        // Community airdrop reserve: 25% (held by owner for distribution)
        uint256 airdropAmount = 25_000_000 * 10**18;
        _mint(initialOwner, airdropAmount);
        totalMinted += airdropAmount;
        emit TokensMinted(initialOwner, airdropAmount, "Community airdrop reserve");

        // Liquidity reserve: 25% (held by owner for LP creation)
        uint256 liquidityAmount = 25_000_000 * 10**18;
        _mint(initialOwner, liquidityAmount);
        totalMinted += liquidityAmount;
        emit TokensMinted(initialOwner, liquidityAmount, "Liquidity reserve");
    }

    /**
     * @dev Mint new tokens (only callable by owner/governance after timelock)
     * @param to Recipient address
     * @param amount Amount to mint
     * @param reason Description of minting reason for transparency
     */
    function mint(address to, uint256 amount, string calldata reason) external onlyOwner {
        require(totalMinted + amount <= MAX_SUPPLY, "Would exceed max supply");
        totalMinted += amount;
        _mint(to, amount);
        emit TokensMinted(to, amount, reason);
    }

    /**
     * @dev Burns tokens from caller's balance
     * @param amount Amount to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    /**
     * @dev Get the current voting power of an account
     * @param account The address to check
     * @return Current voting power
     */
    function votingPower(address account) external view returns (uint256) {
        return getVotes(account);
    }

    /**
     * @dev Get historical voting power at a specific block
     * @param account The address to check
     * @param blockNumber The block number to query
     * @return Voting power at that block
     */
    function pastVotingPower(address account, uint256 blockNumber) external view returns (uint256) {
        return getPastVotes(account, blockNumber);
    }

    // ============ Required Overrides ============

    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Votes) {
        super._update(from, to, value);
    }

    function nonces(address owner) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }

    /**
     * @dev Override transferOwnership to emit custom event
     */
    function transferOwnership(address newOwner) public override onlyOwner {
        address oldOwner = owner();
        super.transferOwnership(newOwner);
        emit GovernanceOwnershipTransferred(oldOwner, newOwner);
    }
}
