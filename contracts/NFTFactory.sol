// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./LilyPadNFT.sol";

/**
 * @title NFTFactory
 * @dev Factory contract for deploying NFT collections on Monad
 * @notice Deploy this contract once, then use it to create multiple NFT collections
 * @custom:platform The Lily Pad - NFT Launchpad on Monad
 */
contract NFTFactory {
    // ============ Platform Identification ============
    
    /// @notice Platform identifier
    string public constant PLATFORM_NAME = "The Lily Pad";
    
    /// @notice Factory version
    string public constant VERSION = "1.0.0";
    
    /// @notice Chain ID this factory is deployed on
    uint256 public immutable deployedOnChainId;

    // ============ Platform Fee Configuration ============
    
    /// @notice Platform treasury address for fee collection
    address public platformTreasury;
    
    /// @notice Buyback pool address for token buybacks
    address public buybackPool;

    // Events
    event CollectionCreated(
        address indexed collection,
        address indexed creator,
        string name,
        string symbol
    );
    
    /// @notice Detailed event with all collection parameters for indexing
    event LilyPadCollectionDeployed(
        address indexed collection,
        address indexed creator,
        string name,
        string symbol,
        uint256 maxSupply,
        uint256 royaltyBps,
        address royaltyReceiver,
        uint256 timestamp,
        uint256 indexed chainId
    );
    
    /// @notice Emitted when platform addresses are updated
    event PlatformAddressesUpdated(
        address indexed oldTreasury,
        address indexed newTreasury,
        address oldBuyback,
        address newBuyback
    );

    // State
    address public owner;
    bool public isActive = true;
    mapping(address => address[]) public collectionsByCreator;
    address[] public allCollections;
    
    /// @notice Mapping to verify if an address is a LilyPad collection
    mapping(address => bool) public isLilyPadCollection;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier whenActive() {
        require(isActive, "Factory paused");
        _;
    }

    /**
     * @dev Constructor initializes factory with platform addresses
     * @param _platformTreasury Address to receive platform fees
     * @param _buybackPool Address for buyback pool contributions
     */
    constructor(address _platformTreasury, address _buybackPool) {
        require(_platformTreasury != address(0), "Invalid treasury");
        require(_buybackPool != address(0), "Invalid buyback pool");
        
        owner = msg.sender;
        deployedOnChainId = block.chainid;
        platformTreasury = _platformTreasury;
        buybackPool = _buybackPool;
    }

    /**
     * @dev Create a new NFT collection
     * @param name Collection name
     * @param symbol Collection symbol
     * @param maxSupply Maximum number of NFTs
     * @param royaltyBps Royalty in basis points (500 = 5%)
     * @param royaltyReceiver Address to receive royalties
     * @return collection Address of the deployed collection
     */
    function createCollection(
        string memory name,
        string memory symbol,
        uint256 maxSupply,
        uint256 royaltyBps,
        address royaltyReceiver
    ) external whenActive returns (address collection) {
        // Deploy new NFT contract with all required parameters
        LilyPadNFT nft = new LilyPadNFT(
            name,
            symbol,
            maxSupply,
            royaltyBps,
            royaltyReceiver,
            msg.sender,         // creator becomes owner
            address(this),      // factory reference
            platformTreasury,   // platform treasury for fees
            buybackPool         // buyback pool for contributions
        );

        collection = address(nft);
        
        // Track the collection
        collectionsByCreator[msg.sender].push(collection);
        allCollections.push(collection);
        isLilyPadCollection[collection] = true;

        // Emit events for indexing
        emit CollectionCreated(collection, msg.sender, name, symbol);
        emit LilyPadCollectionDeployed(
            collection,
            msg.sender,
            name,
            symbol,
            maxSupply,
            royaltyBps,
            royaltyReceiver,
            block.timestamp,
            block.chainid
        );
        
        return collection;
    }

    /**
     * @dev Alias for createCollection (some interfaces use this name)
     */
    function deployCollection(
        string memory name,
        string memory symbol,
        uint256 maxSupply,
        uint256 royaltyBps,
        address royaltyReceiver
    ) external whenActive returns (address) {
        return this.createCollection(name, symbol, maxSupply, royaltyBps, royaltyReceiver);
    }

    // ============ View Functions ============
    
    /**
     * @notice Verify if an address is a LilyPad collection deployed by this factory
     * @param collection The address to check
     * @return True if collection was deployed by this factory
     */
    function verifyCollection(address collection) external view returns (bool) {
        return isLilyPadCollection[collection];
    }
    
    /**
     * @notice Get factory information
     */
    function getFactoryInfo() external view returns (
        string memory platformName,
        string memory version,
        uint256 chainId,
        uint256 totalCollections,
        bool active
    ) {
        return (PLATFORM_NAME, VERSION, deployedOnChainId, allCollections.length, isActive);
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

    function getCollectionsByCreator(address creator) external view returns (address[] memory) {
        return collectionsByCreator[creator];
    }

    function getAllCollections() external view returns (address[] memory) {
        return allCollections;
    }

    function getCollectionCount() external view returns (uint256) {
        return allCollections.length;
    }

    // ============ Admin Functions ============
    
    /**
     * @notice Update platform treasury and buyback pool addresses
     * @param _platformTreasury New treasury address
     * @param _buybackPool New buyback pool address
     */
    function updatePlatformAddresses(
        address _platformTreasury,
        address _buybackPool
    ) external onlyOwner {
        require(_platformTreasury != address(0), "Invalid treasury");
        require(_buybackPool != address(0), "Invalid buyback pool");
        
        emit PlatformAddressesUpdated(
            platformTreasury,
            _platformTreasury,
            buybackPool,
            _buybackPool
        );
        
        platformTreasury = _platformTreasury;
        buybackPool = _buybackPool;
    }
    
    function setActive(bool _active) external onlyOwner {
        isActive = _active;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}
