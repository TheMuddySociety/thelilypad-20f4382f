// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Battle Contract for Monad (EVM)
// Implements Gamified Floor Swap logic

contract BattleContract is Ownable, ReentrancyGuard {
    
    enum BattleState { Waiting, Active, Ended, Closed }
    enum BattleMode { Duel, Arena, Blitz }

    struct Participant {
        address wallet;
        uint256 volumeSwapped;
        uint256 swapsCount;
        uint256 score;
        bool exists;
    }

    struct Battle {
        address creator;
        address collectionAddress; // NFT Contract
        uint256 entryFee;
        uint256 totalPot;
        uint256 startTime;
        uint256 endTime;
        BattleMode mode;
        uint8 maxPlayers;
        BattleState state;
        address[] participantList;
        address winner;
    }

    // Battle ID -> Battle Data
    mapping(uint256 => Battle) public battles;
    // Battle ID -> Address -> Participant Data
    mapping(uint256 => mapping(address => Participant)) public participants;
    
    uint256 public nextBattleId;
    address public serverAuthority; // Authorized to record swaps/resolve

    event BattleCreated(uint256 indexed battleId, address indexed creator, address collection);
    event PlayerJoined(uint256 indexed battleId, address indexed player);
    event SwapRecorded(uint256 indexed battleId, address indexed player, uint256 volume);
    event RewardsClaimed(uint256 indexed battleId, address indexed winner, uint256 amount);

    constructor(address _serverAuthority) Ownable(msg.sender) {
        serverAuthority = _serverAuthority;
    }

    modifier onlyAuthority() {
        require(msg.sender == serverAuthority, "Caller is not authority");
        _;
    }

    function createBattle(
        address _collectionAddress,
        uint256 _entryFee,
        BattleMode _mode,
        uint256 _durationSeconds,
        uint8 _maxPlayers
    ) external payable nonReentrant {
        require(msg.value == _entryFee, "Entry fee mismatch");
        require(_maxPlayers >= 2, "Min 2 players");

        uint256 battleId = nextBattleId++;
        Battle storage battle = battles[battleId];

        battle.creator = msg.sender;
        battle.collectionAddress = _collectionAddress;
        battle.entryFee = _entryFee;
        battle.totalPot = msg.value;
        battle.mode = _mode;
        battle.maxPlayers = _maxPlayers;
        battle.startTime = block.timestamp;
        battle.endTime = block.timestamp + _durationSeconds;
        battle.state = BattleState.Waiting;
        
        // Add creator as first participant
        _addParticipant(battleId, msg.sender);
        
        emit BattleCreated(battleId, msg.sender, _collectionAddress);
    }

    function joinBattle(uint256 _battleId) external payable nonReentrant {
        Battle storage battle = battles[_battleId];
        require(block.timestamp < battle.endTime, "Battle ended");
        require(battle.participantList.length < battle.maxPlayers, "Battle full");
        require(msg.value == battle.entryFee, "Entry fee mismatch");
        require(!participants[_battleId][msg.sender].exists, "Already joined");

        battle.totalPot += msg.value;
        _addParticipant(_battleId, msg.sender);
        
        // Auto-start if full
        if (battle.participantList.length == battle.maxPlayers) {
            battle.state = BattleState.Active;
        }

        emit PlayerJoined(_battleId, msg.sender);
    }

    function _addParticipant(uint256 _battleId, address _player) internal {
        Battle storage battle = battles[_battleId];
        battle.participantList.push(_player);
        
        participants[_battleId][_player] = Participant({
            wallet: _player,
            volumeSwapped: 0,
            swapsCount: 0,
            score: 0,
            exists: true
        });
    }

    // Called by server authority after verifying on-chain swap event
    function recordSwap(uint256 _battleId, address _player, uint256 _volume) external onlyAuthority {
        Battle storage battle = battles[_battleId];
        require(battle.state == BattleState.Active || battle.state == BattleState.Waiting, "Battle not active");
        
        if (block.timestamp > battle.endTime) {
            battle.state = BattleState.Ended;
            revert("Battle ended");
        }

        require(participants[_battleId][_player].exists, "Player not in battle");

        Participant storage p = participants[_battleId][_player];
        p.volumeSwapped += _volume;
        p.swapsCount += 1;
        p.score = p.volumeSwapped; // Score = Volume

        emit SwapRecorded(_battleId, _player, _volume);
    }

    function claimRewards(uint256 _battleId, address _winner) external onlyAuthority nonReentrant {
        Battle storage battle = battles[_battleId];
        require(battle.state == BattleState.Active || battle.state == BattleState.Ended, "Invalid state");
        
        // Simple validation that winner exists
        require(participants[_battleId][_winner].exists, "Winner not participant");
        
        uint256 reward = battle.totalPot;
        battle.totalPot = 0;
        battle.state = BattleState.Closed;
        battle.winner = _winner;

        (bool sent, ) = payable(_winner).call{value: reward}("");
        require(sent, "Failed to send Ether");

        emit RewardsClaimed(_battleId, _winner, reward);
    }

    // Admin function to update authority
    function setAuthority(address _newAuthority) external onlyOwner {
        serverAuthority = _newAuthority;
    }
}
