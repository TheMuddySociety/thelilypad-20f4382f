// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @title LilyPadTimelock
 * @dev Timelock controller for LilyPad DAO governance execution
 * 
 * Configuration:
 * - Minimum delay: 24 hours (prevents rushed malicious proposals)
 * - Proposers: Only the Governor contract can propose
 * - Executors: Anyone can execute after timelock delay (permissionless)
 * - Admin: Should be renounced after setup for full decentralization
 * 
 * Controlled Functions (after ownership transfer):
 * - Update platform treasury address
 * - Update buyback pool address
 * - Pause/unpause NFT Factory
 * - Transfer factory ownership
 * - Allocate treasury funds
 * - Mint new governance tokens
 */
contract LilyPadTimelock is TimelockController {
    /// @notice Minimum delay for execution: 24 hours
    uint256 public constant MIN_DELAY_SECONDS = 1 days;

    /// @notice Platform version for tracking
    string public constant VERSION = "1.0.0";

    /// @notice Emitted when timelock is initialized
    event TimelockInitialized(
        uint256 minDelay,
        address[] proposers,
        address[] executors,
        address admin
    );

    /**
     * @dev Constructor sets up the timelock with specified roles
     * @param minDelay Minimum delay for execution (should be >= MIN_DELAY_SECONDS for mainnet)
     * @param proposers Addresses allowed to propose (should be Governor contract only)
     * @param executors Addresses allowed to execute (use address(0) for anyone)
     * @param admin Initial admin for setup (should be renounced after configuration)
     */
    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) TimelockController(minDelay, proposers, executors, admin) {
        emit TimelockInitialized(minDelay, proposers, executors, admin);
    }

    /**
     * @dev Returns the timelock configuration
     */
    function getTimelockConfig() external view returns (
        uint256 currentMinDelay,
        string memory version
    ) {
        return (getMinDelay(), VERSION);
    }

    /**
     * @dev Check if an operation is ready for execution
     * @param id The operation identifier
     */
    function isOperationReady(bytes32 id) public view override returns (bool) {
        return super.isOperationReady(id);
    }

    /**
     * @dev Check if an operation is pending
     * @param id The operation identifier
     */
    function isOperationPending(bytes32 id) public view override returns (bool) {
        return super.isOperationPending(id);
    }

    /**
     * @dev Check if an operation has been executed
     * @param id The operation identifier
     */
    function isOperationDone(bytes32 id) public view override returns (bool) {
        return super.isOperationDone(id);
    }

    /**
     * @dev Get the timestamp at which an operation becomes ready
     * @param id The operation identifier
     */
    function getTimestamp(bytes32 id) public view override returns (uint256) {
        return super.getTimestamp(id);
    }
}
