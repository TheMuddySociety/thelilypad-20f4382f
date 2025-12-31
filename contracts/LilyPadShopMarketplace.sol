// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title LilyPadShopMarketplace
 * @dev Marketplace for sticker packs, emote packs, and emoji packs
 * @notice Handles digital item trading for The Lily Pad ecosystem
 * @custom:platform The Lily Pad
 * @custom:website https://TheLilyPad.Fun
 */
contract LilyPadShopMarketplace {
    // ============ Configuration ============
    
    string public constant VERSION = "1.0.0";
    
    /// @notice Shop fee in basis points (2.5% = 250 bps)
    uint256 public constant SHOP_FEE_BPS = 250;
    
    /// @notice Portion of fees that go to buyback pool (50%)
    uint256 public constant BUYBACK_ALLOCATION_BPS = 5000;
    
    // ============ Enums ============
    
    enum ItemType { STICKER_PACK, EMOTE_PACK, EMOJI_PACK }
    
    // ============ State Variables ============
    
    address public owner;
    address public platformTreasury;
    address public buybackController;
    bool public isActive;
    
    // Volume tracking
    uint256 public totalVolume;
    mapping(ItemType => uint256) public volumeByType;
    
    // Item storage
    struct ShopItem {
        bytes32 itemId;       // Off-chain item ID reference
        address creator;
        ItemType itemType;
        uint256 price;
        uint256 totalSales;
        bool isActive;
    }
    
    // Listing storage (for secondary market)
    struct ShopListing {
        uint256 shopItemIndex;
        address seller;
        uint256 price;
        bool isActive;
    }
    
    ShopItem[] public shopItems;
    ShopListing[] public shopListings;
    
    // Mappings
    mapping(bytes32 => uint256) public itemIdToIndex;
    mapping(address => mapping(bytes32 => bool)) public userPurchases;
    
    // ============ Events ============
    
    event ItemCreated(
        uint256 indexed itemIndex,
        bytes32 indexed itemId,
        address indexed creator,
        ItemType itemType,
        uint256 price
    );
    
    event ItemPurchased(
        uint256 indexed itemIndex,
        bytes32 indexed itemId,
        address indexed buyer,
        address creator,
        uint256 price,
        uint256 platformFee,
        uint256 buybackContribution
    );
    
    event ItemListed(
        uint256 indexed listingId,
        bytes32 indexed itemId,
        address indexed seller,
        uint256 price
    );
    
    event ListingSold(
        uint256 indexed listingId,
        address indexed seller,
        address indexed buyer,
        uint256 price
    );
    
    event VolumeUpdated(ItemType indexed itemType, uint256 amount, uint256 newTotalVolume);
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier whenActive() {
        require(isActive, "Shop paused");
        _;
    }
    
    // ============ Constructor ============
    
    constructor(address _platformTreasury, address _buybackController) {
        owner = msg.sender;
        platformTreasury = _platformTreasury;
        buybackController = _buybackController;
        isActive = true;
    }
    
    // ============ Item Functions ============
    
    /**
     * @notice Create a new shop item (sticker/emote/emoji pack)
     * @param itemId Off-chain item identifier
     * @param itemType Type of item (STICKER_PACK, EMOTE_PACK, EMOJI_PACK)
     * @param price Price in wei
     */
    function createItem(
        bytes32 itemId,
        ItemType itemType,
        uint256 price
    ) external whenActive returns (uint256) {
        require(price > 0, "Price must be > 0");
        require(itemIdToIndex[itemId] == 0, "Item already exists");
        
        uint256 itemIndex = shopItems.length;
        shopItems.push(ShopItem({
            itemId: itemId,
            creator: msg.sender,
            itemType: itemType,
            price: price,
            totalSales: 0,
            isActive: true
        }));
        
        itemIdToIndex[itemId] = itemIndex + 1; // +1 to distinguish from 0
        
        emit ItemCreated(itemIndex, itemId, msg.sender, itemType, price);
        
        return itemIndex;
    }
    
    /**
     * @notice Purchase a shop item
     * @param itemIndex The index of the item to purchase
     */
    function purchaseItem(uint256 itemIndex) external payable whenActive {
        require(itemIndex < shopItems.length, "Invalid item");
        ShopItem storage item = shopItems[itemIndex];
        require(item.isActive, "Item not active");
        require(msg.value >= item.price, "Insufficient payment");
        require(!userPurchases[msg.sender][item.itemId], "Already purchased");
        
        // Mark as purchased
        userPurchases[msg.sender][item.itemId] = true;
        item.totalSales++;
        
        // Calculate fees
        uint256 platformFee = (item.price * SHOP_FEE_BPS) / 10000;
        uint256 buybackContribution = (platformFee * BUYBACK_ALLOCATION_BPS) / 10000;
        uint256 treasuryAmount = platformFee - buybackContribution;
        uint256 creatorAmount = item.price - platformFee;
        
        // Update volume
        _updateVolume(item.itemType, item.price);
        
        // Distribute payments
        _distributeFees(item.creator, creatorAmount, treasuryAmount, buybackContribution, item.itemType);
        
        // Refund excess
        if (msg.value > item.price) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - item.price}("");
            require(refundSuccess, "Refund failed");
        }
        
        emit ItemPurchased(
            itemIndex,
            item.itemId,
            msg.sender,
            item.creator,
            item.price,
            platformFee,
            buybackContribution
        );
    }
    
    /**
     * @notice Update item price
     * @param itemIndex The item index
     * @param newPrice The new price
     */
    function updateItemPrice(uint256 itemIndex, uint256 newPrice) external {
        require(itemIndex < shopItems.length, "Invalid item");
        ShopItem storage item = shopItems[itemIndex];
        require(item.creator == msg.sender, "Not creator");
        require(newPrice > 0, "Price must be > 0");
        
        item.price = newPrice;
    }
    
    /**
     * @notice Deactivate an item
     * @param itemIndex The item index
     */
    function deactivateItem(uint256 itemIndex) external {
        require(itemIndex < shopItems.length, "Invalid item");
        ShopItem storage item = shopItems[itemIndex];
        require(item.creator == msg.sender || msg.sender == owner, "Not authorized");
        
        item.isActive = false;
    }
    
    // ============ Internal Functions ============
    
    function _updateVolume(ItemType itemType, uint256 amount) internal {
        totalVolume += amount;
        volumeByType[itemType] += amount;
        
        emit VolumeUpdated(itemType, amount, totalVolume);
        
        // Notify buyback controller
        if (buybackController != address(0)) {
            string memory sourceType = _getSourceType(itemType);
            try IBuybackController(buybackController).addVolume(sourceType, amount) {
                // Volume added successfully
            } catch {
                // Ignore errors from buyback controller
            }
        }
    }
    
    function _getSourceType(ItemType itemType) internal pure returns (string memory) {
        if (itemType == ItemType.STICKER_PACK) return "sticker";
        if (itemType == ItemType.EMOTE_PACK) return "emote";
        return "emoji";
    }
    
    function _distributeFees(
        address creator,
        uint256 creatorAmount,
        uint256 treasuryAmount,
        uint256 buybackContribution,
        ItemType /* itemType */
    ) internal {
        // Pay creator
        if (creatorAmount > 0) {
            (bool creatorSuccess, ) = creator.call{value: creatorAmount}("");
            require(creatorSuccess, "Creator payment failed");
        }
        
        // Pay treasury
        if (treasuryAmount > 0 && platformTreasury != address(0)) {
            (bool treasurySuccess, ) = platformTreasury.call{value: treasuryAmount}("");
            require(treasurySuccess, "Treasury payment failed");
        }
        
        // Send to buyback pool
        if (buybackContribution > 0 && buybackController != address(0)) {
            (bool buybackSuccess, ) = buybackController.call{value: buybackContribution}("");
            require(buybackSuccess, "Buyback payment failed");
        }
    }
    
    // ============ View Functions ============
    
    function getItem(uint256 itemIndex) external view returns (
        bytes32 itemId,
        address creator,
        ItemType itemType,
        uint256 price,
        uint256 totalSales,
        bool isActiveStatus
    ) {
        require(itemIndex < shopItems.length, "Invalid item");
        ShopItem storage item = shopItems[itemIndex];
        return (
            item.itemId,
            item.creator,
            item.itemType,
            item.price,
            item.totalSales,
            item.isActive
        );
    }
    
    function getItemCount() external view returns (uint256) {
        return shopItems.length;
    }
    
    function hasUserPurchased(address user, bytes32 itemId) external view returns (bool) {
        return userPurchases[user][itemId];
    }
    
    function calculateFees(uint256 salePrice) external pure returns (
        uint256 platformFee,
        uint256 buybackContribution,
        uint256 treasuryAmount,
        uint256 creatorAmount
    ) {
        platformFee = (salePrice * SHOP_FEE_BPS) / 10000;
        buybackContribution = (platformFee * BUYBACK_ALLOCATION_BPS) / 10000;
        treasuryAmount = platformFee - buybackContribution;
        creatorAmount = salePrice - platformFee;
    }
    
    function getShopStats() external view returns (
        uint256 _totalVolume,
        uint256 stickerVolume,
        uint256 emoteVolume,
        uint256 emojiVolume,
        uint256 totalItems,
        bool _isActive
    ) {
        return (
            totalVolume,
            volumeByType[ItemType.STICKER_PACK],
            volumeByType[ItemType.EMOTE_PACK],
            volumeByType[ItemType.EMOJI_PACK],
            shopItems.length,
            isActive
        );
    }
    
    // ============ Admin Functions ============
    
    function setActive(bool _active) external onlyOwner {
        isActive = _active;
    }
    
    function updateAddresses(address _treasury, address _buybackController) external onlyOwner {
        if (_treasury != address(0)) platformTreasury = _treasury;
        if (_buybackController != address(0)) buybackController = _buybackController;
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
    
    // Allow contract to receive ETH
    receive() external payable {}
}

// Interface for buyback controller
interface IBuybackController {
    function addVolume(string calldata sourceType, uint256 amount) external;
}
