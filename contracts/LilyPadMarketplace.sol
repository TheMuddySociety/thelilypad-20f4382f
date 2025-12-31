// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title LilyPadMarketplace
 * @dev NFT Marketplace contract with platform fees and buyback mechanics
 * @notice Handles all secondary NFT sales for The Lily Pad ecosystem
 * @custom:platform The Lily Pad - NFT Marketplace on Monad
 * @custom:website https://TheLilyPad.Fun
 */
contract LilyPadMarketplace {
    // ============ Platform Configuration ============
    
    string public constant PLATFORM_NAME = "The Lily Pad Marketplace";
    string public constant VERSION = "1.0.0";
    
    /// @notice Marketplace fee in basis points (2.5% = 250 bps)
    uint256 public constant MARKETPLACE_FEE_BPS = 250;
    
    /// @notice Portion of fees that go to buyback pool (50%)
    uint256 public constant BUYBACK_ALLOCATION_BPS = 5000;
    
    // ============ State Variables ============
    
    address public owner;
    address public platformTreasury;
    address public buybackPool;
    bool public isActive;
    
    // Volume tracking
    uint256 public totalVolume;
    uint256 public dailyVolume;
    uint256 public lastVolumeReset;
    uint256 public totalListings;
    uint256 public totalSales;
    
    // Listing storage
    struct Listing {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 price;
        uint256 createdAt;
        bool isActive;
    }
    
    // Offer storage
    struct Offer {
        address offerer;
        address nftContract;
        uint256 tokenId;
        uint256 amount;
        uint256 expiresAt;
        bool isActive;
    }
    
    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Offer) public offers;
    uint256 public nextListingId;
    uint256 public nextOfferId;
    
    // NFT to listing mapping
    mapping(address => mapping(uint256 => uint256)) public nftToListingId;
    
    // ============ Events ============
    
    event Listed(
        uint256 indexed listingId,
        address indexed seller,
        address indexed nftContract,
        uint256 tokenId,
        uint256 price
    );
    
    event ListingCancelled(uint256 indexed listingId, address indexed seller);
    
    event Sold(
        uint256 indexed listingId,
        address indexed seller,
        address indexed buyer,
        address nftContract,
        uint256 tokenId,
        uint256 price,
        uint256 platformFee,
        uint256 buybackContribution
    );
    
    event OfferMade(
        uint256 indexed offerId,
        address indexed offerer,
        address indexed nftContract,
        uint256 tokenId,
        uint256 amount,
        uint256 expiresAt
    );
    
    event OfferAccepted(
        uint256 indexed offerId,
        address indexed seller,
        address indexed offerer,
        address nftContract,
        uint256 tokenId,
        uint256 amount
    );
    
    event OfferCancelled(uint256 indexed offerId, address indexed offerer);
    
    event VolumeUpdated(uint256 newTotalVolume, uint256 newDailyVolume);
    
    event FeesDistributed(
        uint256 platformFee,
        uint256 treasuryAmount,
        uint256 buybackContribution
    );
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier whenActive() {
        require(isActive, "Marketplace paused");
        _;
    }
    
    // ============ Constructor ============
    
    constructor(address _platformTreasury, address _buybackPool) {
        owner = msg.sender;
        platformTreasury = _platformTreasury;
        buybackPool = _buybackPool;
        isActive = true;
        lastVolumeReset = block.timestamp;
        nextListingId = 1;
        nextOfferId = 1;
    }
    
    // ============ Listing Functions ============
    
    /**
     * @notice List an NFT for sale
     * @param nftContract The NFT contract address
     * @param tokenId The token ID to list
     * @param price The listing price in wei
     */
    function listNFT(
        address nftContract,
        uint256 tokenId,
        uint256 price
    ) external whenActive returns (uint256) {
        require(price > 0, "Price must be > 0");
        
        // Verify ownership and approval
        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Not token owner");
        require(
            nft.isApprovedForAll(msg.sender, address(this)) ||
            nft.getApproved(tokenId) == address(this),
            "Not approved"
        );
        
        // Check if already listed
        uint256 existingListingId = nftToListingId[nftContract][tokenId];
        if (existingListingId != 0) {
            require(!listings[existingListingId].isActive, "Already listed");
        }
        
        uint256 listingId = nextListingId++;
        listings[listingId] = Listing({
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            price: price,
            createdAt: block.timestamp,
            isActive: true
        });
        
        nftToListingId[nftContract][tokenId] = listingId;
        totalListings++;
        
        emit Listed(listingId, msg.sender, nftContract, tokenId, price);
        
        return listingId;
    }
    
    /**
     * @notice Cancel a listing
     * @param listingId The listing ID to cancel
     */
    function cancelListing(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        require(listing.seller == msg.sender, "Not seller");
        require(listing.isActive, "Not active");
        
        listing.isActive = false;
        delete nftToListingId[listing.nftContract][listing.tokenId];
        
        emit ListingCancelled(listingId, msg.sender);
    }
    
    /**
     * @notice Buy a listed NFT
     * @param listingId The listing ID to purchase
     */
    function buyNFT(uint256 listingId) external payable whenActive {
        Listing storage listing = listings[listingId];
        require(listing.isActive, "Not active");
        require(msg.value >= listing.price, "Insufficient payment");
        require(msg.sender != listing.seller, "Cannot buy own listing");
        
        // Mark as sold
        listing.isActive = false;
        delete nftToListingId[listing.nftContract][listing.tokenId];
        
        // Calculate fees
        uint256 platformFee = (listing.price * MARKETPLACE_FEE_BPS) / 10000;
        uint256 buybackContribution = (platformFee * BUYBACK_ALLOCATION_BPS) / 10000;
        uint256 treasuryAmount = platformFee - buybackContribution;
        uint256 sellerAmount = listing.price - platformFee;
        
        // Update volume
        _updateVolume(listing.price);
        totalSales++;
        
        // Transfer NFT to buyer
        IERC721(listing.nftContract).transferFrom(listing.seller, msg.sender, listing.tokenId);
        
        // Distribute payments
        _distributeFees(listing.seller, sellerAmount, treasuryAmount, buybackContribution);
        
        // Refund excess
        if (msg.value > listing.price) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - listing.price}("");
            require(refundSuccess, "Refund failed");
        }
        
        emit Sold(
            listingId,
            listing.seller,
            msg.sender,
            listing.nftContract,
            listing.tokenId,
            listing.price,
            platformFee,
            buybackContribution
        );
        
        emit FeesDistributed(platformFee, treasuryAmount, buybackContribution);
    }
    
    // ============ Offer Functions ============
    
    /**
     * @notice Make an offer on an NFT
     * @param nftContract The NFT contract address
     * @param tokenId The token ID to make offer on
     * @param duration How long the offer is valid (in seconds)
     */
    function makeOffer(
        address nftContract,
        uint256 tokenId,
        uint256 duration
    ) external payable whenActive returns (uint256) {
        require(msg.value > 0, "Amount must be > 0");
        require(duration > 0 && duration <= 30 days, "Invalid duration");
        
        uint256 offerId = nextOfferId++;
        offers[offerId] = Offer({
            offerer: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            amount: msg.value,
            expiresAt: block.timestamp + duration,
            isActive: true
        });
        
        emit OfferMade(offerId, msg.sender, nftContract, tokenId, msg.value, block.timestamp + duration);
        
        return offerId;
    }
    
    /**
     * @notice Accept an offer on your NFT
     * @param offerId The offer ID to accept
     */
    function acceptOffer(uint256 offerId) external whenActive {
        Offer storage offer = offers[offerId];
        require(offer.isActive, "Offer not active");
        require(block.timestamp < offer.expiresAt, "Offer expired");
        
        // Verify ownership
        IERC721 nft = IERC721(offer.nftContract);
        require(nft.ownerOf(offer.tokenId) == msg.sender, "Not token owner");
        require(
            nft.isApprovedForAll(msg.sender, address(this)) ||
            nft.getApproved(offer.tokenId) == address(this),
            "Not approved"
        );
        
        offer.isActive = false;
        
        // Cancel any active listing
        uint256 listingId = nftToListingId[offer.nftContract][offer.tokenId];
        if (listingId != 0 && listings[listingId].isActive) {
            listings[listingId].isActive = false;
            delete nftToListingId[offer.nftContract][offer.tokenId];
        }
        
        // Calculate fees
        uint256 platformFee = (offer.amount * MARKETPLACE_FEE_BPS) / 10000;
        uint256 buybackContribution = (platformFee * BUYBACK_ALLOCATION_BPS) / 10000;
        uint256 treasuryAmount = platformFee - buybackContribution;
        uint256 sellerAmount = offer.amount - platformFee;
        
        // Update volume
        _updateVolume(offer.amount);
        totalSales++;
        
        // Transfer NFT to offerer
        nft.transferFrom(msg.sender, offer.offerer, offer.tokenId);
        
        // Distribute payments
        _distributeFees(msg.sender, sellerAmount, treasuryAmount, buybackContribution);
        
        emit OfferAccepted(offerId, msg.sender, offer.offerer, offer.nftContract, offer.tokenId, offer.amount);
        emit FeesDistributed(platformFee, treasuryAmount, buybackContribution);
    }
    
    /**
     * @notice Cancel an offer and get refund
     * @param offerId The offer ID to cancel
     */
    function cancelOffer(uint256 offerId) external {
        Offer storage offer = offers[offerId];
        require(offer.offerer == msg.sender, "Not offerer");
        require(offer.isActive, "Not active");
        
        offer.isActive = false;
        
        // Refund offer amount
        (bool success, ) = msg.sender.call{value: offer.amount}("");
        require(success, "Refund failed");
        
        emit OfferCancelled(offerId, msg.sender);
    }
    
    // ============ Internal Functions ============
    
    function _updateVolume(uint256 amount) internal {
        // Reset daily volume if new day
        if (block.timestamp >= lastVolumeReset + 1 days) {
            dailyVolume = 0;
            lastVolumeReset = block.timestamp - (block.timestamp % 1 days);
        }
        
        totalVolume += amount;
        dailyVolume += amount;
        
        emit VolumeUpdated(totalVolume, dailyVolume);
    }
    
    function _distributeFees(
        address seller,
        uint256 sellerAmount,
        uint256 treasuryAmount,
        uint256 buybackContribution
    ) internal {
        // Pay seller
        if (sellerAmount > 0) {
            (bool sellerSuccess, ) = seller.call{value: sellerAmount}("");
            require(sellerSuccess, "Seller payment failed");
        }
        
        // Pay treasury
        if (treasuryAmount > 0 && platformTreasury != address(0)) {
            (bool treasurySuccess, ) = platformTreasury.call{value: treasuryAmount}("");
            require(treasurySuccess, "Treasury payment failed");
        }
        
        // Pay buyback pool
        if (buybackContribution > 0 && buybackPool != address(0)) {
            (bool buybackSuccess, ) = buybackPool.call{value: buybackContribution}("");
            require(buybackSuccess, "Buyback payment failed");
        }
    }
    
    // ============ View Functions ============
    
    function getListing(uint256 listingId) external view returns (
        address seller,
        address nftContract,
        uint256 tokenId,
        uint256 price,
        uint256 createdAt,
        bool isActiveStatus
    ) {
        Listing storage listing = listings[listingId];
        return (
            listing.seller,
            listing.nftContract,
            listing.tokenId,
            listing.price,
            listing.createdAt,
            listing.isActive
        );
    }
    
    function getOffer(uint256 offerId) external view returns (
        address offerer,
        address nftContract,
        uint256 tokenId,
        uint256 amount,
        uint256 expiresAt,
        bool isActiveStatus
    ) {
        Offer storage offer = offers[offerId];
        return (
            offer.offerer,
            offer.nftContract,
            offer.tokenId,
            offer.amount,
            offer.expiresAt,
            offer.isActive
        );
    }
    
    function calculateFees(uint256 salePrice) external pure returns (
        uint256 platformFee,
        uint256 buybackContribution,
        uint256 treasuryAmount,
        uint256 sellerAmount
    ) {
        platformFee = (salePrice * MARKETPLACE_FEE_BPS) / 10000;
        buybackContribution = (platformFee * BUYBACK_ALLOCATION_BPS) / 10000;
        treasuryAmount = platformFee - buybackContribution;
        sellerAmount = salePrice - platformFee;
    }
    
    function getMarketplaceStats() external view returns (
        uint256 _totalVolume,
        uint256 _dailyVolume,
        uint256 _totalListings,
        uint256 _totalSales,
        bool _isActive
    ) {
        return (totalVolume, dailyVolume, totalListings, totalSales, isActive);
    }
    
    // ============ Admin Functions ============
    
    function setActive(bool _active) external onlyOwner {
        isActive = _active;
    }
    
    function updateAddresses(address _treasury, address _buybackPool) external onlyOwner {
        if (_treasury != address(0)) platformTreasury = _treasury;
        if (_buybackPool != address(0)) buybackPool = _buybackPool;
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
    
    // Allow contract to receive ETH
    receive() external payable {}
}

// Minimal ERC721 interface
interface IERC721 {
    function ownerOf(uint256 tokenId) external view returns (address);
    function getApproved(uint256 tokenId) external view returns (address);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
    function transferFrom(address from, address to, uint256 tokenId) external;
}
