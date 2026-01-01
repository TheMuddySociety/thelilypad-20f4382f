// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SimpleLilyPadNFT.sol";

/**
 * @title SimpleNFTFactory
 * @notice Simplified factory for deploying LilyPad NFT collections
 * @dev Matches frontend ABI while avoiding stack-too-deep errors
 */
contract SimpleNFTFactory {
    // Platform identification
    string public constant PLATFORM_NAME = "LilyPad";
    string public constant VERSION = "1.0.0";
    
    // Platform addresses
    address public platformTreasury;
    address public buybackPool;
    address public owner;
    bool public isActive;
    
    // Collection tracking
    address[] public allCollections;
    mapping(address => bool) public isLilyPadCollection;
    mapping(address => address[]) public creatorCollections;
    
    // Events matching frontend expectations
    event CollectionCreated(
        address indexed collection,
        address indexed creator,
        string name,
        string symbol
    );
    
    event LilyPadCollectionDeployed(
        address indexed collection,
        address indexed creator,
        string name,
        uint256 maxSupply,
        uint256 timestamp
    );
    
    event PlatformAddressesUpdated(
        address treasury,
        address buyback
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor(address _treasury, address _buyback) {
        require(_treasury != address(0), "Invalid treasury");
        require(_buyback != address(0), "Invalid buyback");
        
        owner = msg.sender;
        platformTreasury = _treasury;
        buybackPool = _buyback;
        isActive = true;
    }
    
    /**
     * @notice Create a new NFT collection
     * @param name Collection name
     * @param symbol Collection symbol
     * @param maxSupply Maximum token supply
     * @param royaltyBps Royalty in basis points (e.g., 500 = 5%)
     * @param royaltyReceiver Address to receive royalties
     */
    function createCollection(
        string memory name,
        string memory symbol,
        uint256 maxSupply,
        uint256 royaltyBps,
        address royaltyReceiver
    ) external returns (address) {
        require(isActive, "Factory paused");
        require(bytes(name).length > 0, "Empty name");
        require(bytes(symbol).length > 0, "Empty symbol");
        require(maxSupply > 0, "Zero supply");
        require(royaltyBps <= 1000, "Royalty > 10%");
        
        // Deploy new collection
        SimpleLilyPadNFT collection = new SimpleLilyPadNFT(
            name,
            symbol,
            maxSupply,
            royaltyBps,
            royaltyReceiver,
            msg.sender,
            platformTreasury,
            buybackPool
        );
        
        address collectionAddr = address(collection);
        
        // Track collection
        allCollections.push(collectionAddr);
        isLilyPadCollection[collectionAddr] = true;
        creatorCollections[msg.sender].push(collectionAddr);
        
        // Emit events
        emit CollectionCreated(collectionAddr, msg.sender, name, symbol);
        emit LilyPadCollectionDeployed(
            collectionAddr,
            msg.sender,
            name,
            maxSupply,
            block.timestamp
        );
        
        return collectionAddr;
    }
    
    // Alias for compatibility
    function deployCollection(
        string memory name,
        string memory symbol,
        uint256 maxSupply,
        uint256 royaltyBps,
        address royaltyReceiver
    ) external returns (address) {
        return this.createCollection(name, symbol, maxSupply, royaltyBps, royaltyReceiver);
    }
    
    /**
     * @notice Verify if an address is a LilyPad collection
     */
    function verifyCollection(address collection) external view returns (bool) {
        return isLilyPadCollection[collection];
    }
    
    /**
     * @notice Get factory information
     */
    function getFactoryInfo() external view returns (
        string memory platform,
        string memory version,
        uint256 totalCollections,
        bool active
    ) {
        return (PLATFORM_NAME, VERSION, allCollections.length, isActive);
    }
    
    /**
     * @notice Get platform addresses
     */
    function getPlatformAddresses() external view returns (
        address treasury,
        address buyback
    ) {
        return (platformTreasury, buybackPool);
    }
    
    /**
     * @notice Get collections by creator
     */
    function getCollectionsByCreator(address creator) external view returns (address[] memory) {
        return creatorCollections[creator];
    }
    
    /**
     * @notice Get all collections
     */
    function getAllCollections() external view returns (address[] memory) {
        return allCollections;
    }
    
    /**
     * @notice Get collection count
     */
    function getCollectionCount() external view returns (uint256) {
        return allCollections.length;
    }
    
    // Admin functions
    function updatePlatformAddresses(address _treasury, address _buyback) external onlyOwner {
        require(_treasury != address(0) && _buyback != address(0), "Invalid address");
        platformTreasury = _treasury;
        buybackPool = _buyback;
        emit PlatformAddressesUpdated(_treasury, _buyback);
    }
    
    function setActive(bool _active) external onlyOwner {
        isActive = _active;
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }
}
