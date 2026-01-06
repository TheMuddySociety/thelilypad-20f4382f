// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LilyPadMarketplace
 * @dev Simple escrow-based marketplace for trustless NFT swaps.
 */
contract LilyPadMarketplace is ReentrancyGuard, Ownable {
    
    struct Listing {
        address seller;
        address nftAddress;
        uint256 tokenId;
        uint256 price;
        bool active;
    }

    uint256 public listingCount;
    mapping(uint256 => Listing) public listings;
    
    uint256 public marketplaceFeePercent = 250; // 2.5% (base 10000)
    uint256 public constant FEE_DENOMINATOR = 10000;

    event ItemListed(uint256 indexed listingId, address indexed seller, address indexed nftAddress, uint256 tokenId, uint256 price);
    event ItemSold(uint256 indexed listingId, address indexed buyer, address indexed seller, uint256 price);
    event ListingCanceled(uint256 indexed listingId);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev List an NFT for sale. The NFT is transferred to the contract (Escrow).
     */
    function listItem(address _nftAddress, uint256 _tokenId, uint256 _price) external nonReentrant {
        require(_price > 0, "Price must be greater than zero");
        
        IERC721 nft = IERC721(_nftAddress);
        require(nft.ownerOf(_tokenId) == msg.sender, "Not the owner");
        require(nft.isApprovedForAll(msg.sender, address(this)), "Marketplace not approved");

        // Transfer NFT to this contract
        nft.transferFrom(msg.sender, address(this), _tokenId);

        listingCount++;
        listings[listingCount] = Listing({
            seller: msg.sender,
            nftAddress: _nftAddress,
            tokenId: _tokenId,
            price: _price,
            active: true
        });

        emit ItemListed(listingCount, msg.sender, _nftAddress, _tokenId, _price);
    }

    /**
     * @dev Buy an active listing.
     */
    function buyItem(uint256 _listingId) external payable nonReentrant {
        Listing storage listing = listings[_listingId];
        require(listing.active, "Listing not active");
        require(msg.value >= listing.price, "Insufficient payment");

        listing.active = false;
        
        uint256 fee = (listing.price * marketplaceFeePercent) / FEE_DENOMINATOR;
        uint256 sellerProceeds = listing.price - fee;

        // Pay seller
        (bool successSeller, ) = payable(listing.seller).call{value: sellerProceeds}("");
        require(successSeller, "Transfer to seller failed");

        // Transfer NFT to buyer
        IERC721(listing.nftAddress).transferFrom(address(this), msg.sender, listing.tokenId);

        // Refund excess payment
        if (msg.value > listing.price) {
            (bool successRefund, ) = payable(msg.sender).call{value: msg.value - listing.price}("");
            require(successRefund, "Refund failed");
        }

        emit ItemSold(_listingId, msg.sender, listing.seller, listing.price);
    }

    /**
     * @dev Cancel an active listing and return NFT to seller.
     */
    function cancelListing(uint256 _listingId) external nonReentrant {
        Listing storage listing = listings[_listingId];
        require(listing.active, "Listing not active");
        require(listing.seller == msg.sender, "Not the seller");

        listing.active = false;
        
        // Return NFT to seller
        IERC721(listing.nftAddress).transferFrom(address(this), msg.sender, listing.tokenId);

        emit ListingCanceled(_listingId);
    }

    /**
     * @dev Update marketplace fee.
     */
    function setMarketplaceFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 1000, "Fee too high"); // Max 10%
        marketplaceFeePercent = _newFee;
    }

    /**
     * @dev Withdraw accumulated fees.
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
}
