// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./LilyPadNFT.sol";

/**
 * @title NFTFactory
 * @dev Factory contract for deploying NFT collections on Monad
 * @notice Deploy this contract once, then use it to create multiple NFT collections
 */
contract NFTFactory {
    // Events
    event CollectionCreated(
        address indexed collection,
        address indexed creator,
        string name,
        string symbol
    );

    // State
    address public owner;
    bool public isActive = true;
    mapping(address => address[]) public collectionsByCreator;
    address[] public allCollections;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier whenActive() {
        require(isActive, "Factory paused");
        _;
    }

    constructor() {
        owner = msg.sender;
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
        // Deploy new NFT contract
        LilyPadNFT nft = new LilyPadNFT(
            name,
            symbol,
            maxSupply,
            royaltyBps,
            royaltyReceiver,
            msg.sender // creator becomes owner
        );

        collection = address(nft);
        
        // Track the collection
        collectionsByCreator[msg.sender].push(collection);
        allCollections.push(collection);

        emit CollectionCreated(collection, msg.sender, name, symbol);
        
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

    // View functions
    function getCollectionsByCreator(address creator) external view returns (address[] memory) {
        return collectionsByCreator[creator];
    }

    function getAllCollections() external view returns (address[] memory) {
        return allCollections;
    }

    function getCollectionCount() external view returns (uint256) {
        return allCollections.length;
    }

    // Admin functions
    function setActive(bool _active) external onlyOwner {
        isActive = _active;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}
