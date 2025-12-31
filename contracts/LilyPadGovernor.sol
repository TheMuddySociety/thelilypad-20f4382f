// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";

/**
 * @title LilyPadGovernor
 * @dev Governor contract for LilyPad DAO governance
 * 
 * Governance Parameters:
 * - Voting delay: 7200 blocks (~1 day on Monad at 12s/block)
 * - Voting period: 50400 blocks (~7 days)
 * - Proposal threshold: 100,000 LILY (0.1% of supply to create proposals)
 * - Quorum: 4% of total supply must participate
 * 
 * Features:
 * - Standard Governor with counting (For/Against/Abstain)
 * - ERC20Votes integration for voting power snapshots
 * - Timelock integration for execution delay
 * - Configurable governance parameters
 * 
 * Voting:
 * - 0 = Against
 * - 1 = For
 * - 2 = Abstain
 */
contract LilyPadGovernor is 
    Governor, 
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl 
{
    /// @notice Platform version for tracking
    string public constant VERSION = "1.0.0";

    /// @notice Emitted when a proposal is created with additional metadata
    event ProposalCreatedWithMetadata(
        uint256 indexed proposalId,
        address indexed proposer,
        string title,
        string description
    );

    /// @notice Emitted when a vote is cast with reason
    event VoteCastWithMetadata(
        uint256 indexed proposalId,
        address indexed voter,
        uint8 support,
        uint256 weight,
        string reason
    );

    /**
     * @dev Constructor initializes the governor with token and timelock
     * @param _token The governance token (LilyPadToken)
     * @param _timelock The timelock controller (LilyPadTimelock)
     * 
     * GovernorSettings parameters:
     * - votingDelay: 7200 blocks (~1 day) - time before voting starts
     * - votingPeriod: 50400 blocks (~7 days) - duration of voting
     * - proposalThreshold: 100,000 LILY tokens required to create proposal
     */
    constructor(
        IVotes _token, 
        TimelockController _timelock
    )
        Governor("LilyPad Governor")
        GovernorSettings(
            7200,           // ~1 day voting delay
            50400,          // ~7 day voting period
            100000e18       // 100,000 LILY proposal threshold
        )
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(4)  // 4% quorum
        GovernorTimelockControl(_timelock)
    {}

    /**
     * @dev Create a proposal with metadata for off-chain indexing
     * @param targets Contract addresses to call
     * @param values ETH values to send
     * @param calldatas Encoded function calls
     * @param description Full proposal description
     * @param title Short proposal title for display
     */
    function proposeWithMetadata(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description,
        string memory title
    ) public returns (uint256) {
        uint256 proposalId = propose(targets, values, calldatas, description);
        emit ProposalCreatedWithMetadata(proposalId, msg.sender, title, description);
        return proposalId;
    }

    /**
     * @dev Cast vote with reason and emit metadata event
     * @param proposalId The proposal to vote on
     * @param support Vote direction (0=Against, 1=For, 2=Abstain)
     * @param reason Explanation for the vote
     */
    function castVoteWithReasonAndMetadata(
        uint256 proposalId,
        uint8 support,
        string calldata reason
    ) public returns (uint256) {
        uint256 weight = castVoteWithReason(proposalId, support, reason);
        emit VoteCastWithMetadata(proposalId, msg.sender, support, weight, reason);
        return weight;
    }

    /**
     * @dev Get governance configuration
     */
    function getGovernanceConfig() external view returns (
        uint256 currentVotingDelay,
        uint256 currentVotingPeriod,
        uint256 currentProposalThreshold,
        uint256 currentQuorumNumerator,
        string memory version
    ) {
        return (
            votingDelay(),
            votingPeriod(),
            proposalThreshold(),
            quorumNumerator(),
            VERSION
        );
    }

    /**
     * @dev Get proposal vote counts
     * @param proposalId The proposal to query
     */
    function getProposalVotes(uint256 proposalId) external view returns (
        uint256 againstVotes,
        uint256 forVotes,
        uint256 abstainVotes
    ) {
        return proposalVotes(proposalId);
    }

    // ============ Required Overrides ============

    function votingDelay() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.votingDelay();
    }

    function votingPeriod() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.votingPeriod();
    }

    function quorum(uint256 blockNumber) public view override(Governor, GovernorVotesQuorumFraction) returns (uint256) {
        return super.quorum(blockNumber);
    }

    function state(uint256 proposalId) public view override(Governor, GovernorTimelockControl) returns (ProposalState) {
        return super.state(proposalId);
    }

    function proposalNeedsQueuing(uint256 proposalId) public view override(Governor, GovernorTimelockControl) returns (bool) {
        return super.proposalNeedsQueuing(proposalId);
    }

    function proposalThreshold() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.proposalThreshold();
    }

    function _queueOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint48) {
        return super._queueOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _executeOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) {
        super._executeOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor() internal view override(Governor, GovernorTimelockControl) returns (address) {
        return super._executor();
    }
}
