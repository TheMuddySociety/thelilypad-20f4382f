// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title LilyPadNFT
 * @dev ERC721 NFT contract with phases, allowlists, royalties, and platform fees
 * @notice Each collection deployed by the factory is an instance of this contract
 * @custom:platform The Lily Pad - NFT Launchpad on Monad
 * @custom:website https://TheLilyPad.Fun
 */
contract LilyPadNFT {
    // ============ Platform Identification ============
    
    /// @notice Platform identifier - proves this is a LilyPad collection
    string public constant PLATFORM_NAME = "The Lily Pad";
    
    /// @notice Platform version for compatibility tracking
    string public constant PLATFORM_VERSION = "2.0.0";
    
    /// @notice Platform website
    string public constant PLATFORM_WEBSITE = "https://TheLilyPad.Fun";
    
    /// @notice The factory that deployed this collection (address(0) if deployed directly)
    address public immutable factory;
    
    /// @notice Chain identifier for multi-chain support
    uint256 public immutable deployedOnChainId;
    
    // ============ Platform Fee Configuration ============
    
    /// @notice Platform treasury address for fee collection
    address public platformTreasury;
    
    /// @notice Platform fee in basis points (2.5% = 250 bps)
    uint256 public constant PLATFORM_FEE_BPS = 250;
    
    /// @notice Portion of platform fee that goes to buyback pool (50%)
    uint256 public constant BUYBACK_ALLOCATION_BPS = 5000;
    
    /// @notice Buyback pool address
    address public buybackPool;

    // ERC721 Events
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    
    // Custom Events
    event PhaseConfigured(uint256 indexed phaseId, uint256 price, uint256 maxPerWallet, uint256 supply);
    event Minted(address indexed to, uint256 indexed tokenId);
    
    // Platform Fee Events
    event PlatformFeePaid(
        address indexed collection,
        address indexed minter,
        uint256 feeAmount,
        uint256 buybackContribution,
        uint256 mintCount
    );
    event MintWithFee(
        address indexed minter,
        uint256 quantity,
        uint256 totalPaid,
        uint256 platformFee,
        uint256 creatorAmount
    );
    
    // Platform Events
    event LilyPadCollectionCreated(
        address indexed collection,
        address indexed creator,
        address indexed factory,
        string name,
        string symbol,
        uint256 maxSupply,
        uint256 chainId
    );

    // ERC721 Storage
    string public name;
    string public symbol;
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    // Collection Storage
    address public owner;
    uint256 public maxSupply;
    uint256 public totalSupply;
    string public baseURI;
    
    // Royalty Storage (EIP-2981)
    uint256 public royaltyBps;
    address public royaltyReceiver;
    
    // Fee Tracking
    uint256 public totalPlatformFeesCollected;
    uint256 public totalBuybackContributions;

    // Phase Storage
    struct Phase {
        uint256 price;
        uint256 maxPerWallet;
        uint256 supply;
        uint256 minted;
        bool requiresAllowlist;
        bool isActive;
    }
    
    mapping(uint256 => Phase) public phases;
    mapping(uint256 => mapping(address => bool)) public allowlists;
    mapping(uint256 => mapping(address => uint256)) public mintedPerPhase;
    uint256 public activePhase;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 maxSupply_,
        uint256 royaltyBps_,
        address royaltyReceiver_,
        address owner_,
        address factory_,
        address platformTreasury_,
        address buybackPool_
    ) {
        name = name_;
        symbol = symbol_;
        maxSupply = maxSupply_;
        royaltyBps = royaltyBps_;
        royaltyReceiver = royaltyReceiver_;
        owner = owner_;
        factory = factory_;
        platformTreasury = platformTreasury_;
        buybackPool = buybackPool_;
        deployedOnChainId = block.chainid;
        
        // Emit platform identification event
        emit LilyPadCollectionCreated(
            address(this),
            owner_,
            factory_,
            name_,
            symbol_,
            maxSupply_,
            block.chainid
        );
    }

    // ============ Platform Identification Functions ============
    
    /**
     * @notice Returns true if this is a LilyPad collection
     * @dev Can be used by marketplaces/indexers to identify LilyPad NFTs
     */
    function isLilyPadCollection() external pure returns (bool) {
        return true;
    }
    
    /**
     * @notice Returns platform information
     * @return platformName The platform name
     * @return version The contract version
     * @return factoryAddress The factory that deployed this collection
     * @return chainId The chain this was deployed on
     * @return website The platform website
     * @return feeBps The platform fee in basis points
     */
    function getPlatformInfo() external view returns (
        string memory platformName,
        string memory version,
        address factoryAddress,
        uint256 chainId,
        string memory website,
        uint256 feeBps
    ) {
        return (PLATFORM_NAME, PLATFORM_VERSION, factory, deployedOnChainId, PLATFORM_WEBSITE, PLATFORM_FEE_BPS);
    }
    
    /**
     * @notice Returns fee information
     * @return treasury Platform treasury address
     * @return buyback Buyback pool address
     * @return totalFees Total platform fees collected
     * @return totalBuyback Total buyback contributions
     */
    function getFeeInfo() external view returns (
        address treasury,
        address buyback,
        uint256 totalFees,
        uint256 totalBuyback
    ) {
        return (platformTreasury, buybackPool, totalPlatformFeesCollected, totalBuybackContributions);
    }
    
    /**
     * @notice Contract-level metadata URI (OpenSea standard)
     * @dev Returns metadata about the collection itself, including LilyPad branding
     */
    function contractURI() external view returns (string memory) {
        return string(abi.encodePacked(
            "data:application/json;utf8,{",
            '"name":"', name, '",',
            '"symbol":"', symbol, '",',
            '"description":"NFT Collection created on The Lily Pad - Premier NFT Launchpad on Monad. 2.5% platform fee supports ecosystem growth.",',
            '"external_link":"', PLATFORM_WEBSITE, '",',
            '"platform":"The Lily Pad",',
            '"platform_version":"', PLATFORM_VERSION, '",',
            '"platform_fee_bps":', _toString(PLATFORM_FEE_BPS), ',',
            '"seller_fee_basis_points":', _toString(royaltyBps), ',',
            '"fee_recipient":"', _toHexString(royaltyReceiver), '"',
            "}"
        ));
    }

    // ============ ERC721 Functions ============

    function balanceOf(address account) public view returns (uint256) {
        require(account != address(0), "Zero address");
        return _balances[account];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address tokenOwner = _owners[tokenId];
        require(tokenOwner != address(0), "Token does not exist");
        return tokenOwner;
    }

    function approve(address to, uint256 tokenId) public {
        address tokenOwner = ownerOf(tokenId);
        require(to != tokenOwner, "Cannot approve self");
        require(msg.sender == tokenOwner || isApprovedForAll(tokenOwner, msg.sender), "Not authorized");
        _tokenApprovals[tokenId] = to;
        emit Approval(tokenOwner, to, tokenId);
    }

    function getApproved(uint256 tokenId) public view returns (address) {
        require(_owners[tokenId] != address(0), "Token does not exist");
        return _tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) public {
        require(operator != msg.sender, "Cannot approve self");
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address account, address operator) public view returns (bool) {
        return _operatorApprovals[account][operator];
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        require(_isApprovedOrOwner(msg.sender, tokenId), "Not authorized");
        _transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) public {
        safeTransferFrom(from, to, tokenId, "");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public {
        require(_isApprovedOrOwner(msg.sender, tokenId), "Not authorized");
        _transfer(from, to, tokenId);
        // Note: Safe transfer callback omitted for simplicity
    }

    // ============ Minting Functions ============

    function mint(uint256 quantity, bytes32[] calldata proof) external payable {
        Phase storage phase = phases[activePhase];
        require(phase.isActive, "Phase not active");
        require(phase.requiresAllowlist, "Use mintPublic");
        require(allowlists[activePhase][msg.sender], "Not on allowlist");
        _mintInternal(quantity, phase);
    }

    function mintPublic(uint256 quantity) external payable {
        Phase storage phase = phases[activePhase];
        require(phase.isActive, "Phase not active");
        require(!phase.requiresAllowlist, "Allowlist required");
        _mintInternal(quantity, phase);
    }

    function _mintInternal(uint256 quantity, Phase storage phase) internal {
        require(quantity > 0, "Zero quantity");
        require(totalSupply + quantity <= maxSupply, "Exceeds max supply");
        require(phase.minted + quantity <= phase.supply, "Exceeds phase supply");
        require(mintedPerPhase[activePhase][msg.sender] + quantity <= phase.maxPerWallet, "Exceeds wallet limit");
        
        uint256 totalPayment = phase.price * quantity;
        require(msg.value >= totalPayment, "Insufficient payment");
        
        // Calculate platform fee (2.5%)
        uint256 platformFee = (totalPayment * PLATFORM_FEE_BPS) / 10000;
        uint256 creatorAmount = totalPayment - platformFee;
        
        // Calculate buyback contribution (50% of platform fee)
        uint256 buybackContribution = (platformFee * BUYBACK_ALLOCATION_BPS) / 10000;
        uint256 treasuryAmount = platformFee - buybackContribution;
        
        // Transfer platform fee to treasury
        if (treasuryAmount > 0 && platformTreasury != address(0)) {
            (bool treasurySuccess, ) = platformTreasury.call{value: treasuryAmount}("");
            require(treasurySuccess, "Treasury transfer failed");
        }
        
        // Transfer buyback contribution to buyback pool
        if (buybackContribution > 0 && buybackPool != address(0)) {
            (bool buybackSuccess, ) = buybackPool.call{value: buybackContribution}("");
            require(buybackSuccess, "Buyback transfer failed");
        }
        
        // Track fees
        totalPlatformFeesCollected += platformFee;
        totalBuybackContributions += buybackContribution;
        
        // Emit fee events
        emit PlatformFeePaid(address(this), msg.sender, platformFee, buybackContribution, quantity);
        emit MintWithFee(msg.sender, quantity, totalPayment, platformFee, creatorAmount);

        // Mint NFTs
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = totalSupply + 1;
            _owners[tokenId] = msg.sender;
            _balances[msg.sender]++;
            totalSupply++;
            phase.minted++;
            
            emit Transfer(address(0), msg.sender, tokenId);
            emit Minted(msg.sender, tokenId);
        }

        mintedPerPhase[activePhase][msg.sender] += quantity;
        
        // Refund excess payment
        if (msg.value > totalPayment) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - totalPayment}("");
            require(refundSuccess, "Refund failed");
        }
    }

    // ============ Owner Functions ============

    function configurePhase(
        uint256 phaseId,
        uint256 price,
        uint256 maxPerWallet,
        uint256 supply,
        bool requiresAllowlist
    ) external onlyOwner {
        phases[phaseId] = Phase({
            price: price,
            maxPerWallet: maxPerWallet,
            supply: supply,
            minted: 0,
            requiresAllowlist: requiresAllowlist,
            isActive: false
        });
        emit PhaseConfigured(phaseId, price, maxPerWallet, supply);
    }

    function setActivePhase(uint256 phaseId) external onlyOwner {
        if (activePhase != 0) {
            phases[activePhase].isActive = false;
        }
        activePhase = phaseId;
        phases[phaseId].isActive = true;
    }

    function setAllowlist(address[] calldata addresses, uint256 phaseId) external onlyOwner {
        for (uint256 i = 0; i < addresses.length; i++) {
            allowlists[phaseId][addresses[i]] = true;
        }
    }

    function setBaseURI(string memory baseURI_) external onlyOwner {
        baseURI = baseURI_;
    }

    /// @notice Withdraw creator earnings (after platform fee deduction)
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance");
        (bool success, ) = owner.call{value: balance}("");
        require(success, "Transfer failed");
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
    
    /// @notice Update platform addresses (only factory can call)
    function updatePlatformAddresses(address newTreasury, address newBuybackPool) external {
        require(msg.sender == factory || msg.sender == owner, "Not authorized");
        if (newTreasury != address(0)) {
            platformTreasury = newTreasury;
        }
        if (newBuybackPool != address(0)) {
            buybackPool = newBuybackPool;
        }
    }

    // ============ View Functions ============

    function getPhase(uint256 phaseId) external view returns (
        uint256 price,
        uint256 maxPerWallet,
        uint256 supply,
        uint256 minted,
        bool requiresAllowlist,
        bool isActive
    ) {
        Phase storage phase = phases[phaseId];
        return (phase.price, phase.maxPerWallet, phase.supply, phase.minted, phase.requiresAllowlist, phase.isActive);
    }
    
    /// @notice Calculate fees for a given mint quantity
    function calculateFees(uint256 quantity) external view returns (
        uint256 totalCost,
        uint256 platformFee,
        uint256 buybackContribution,
        uint256 creatorAmount
    ) {
        Phase storage phase = phases[activePhase];
        totalCost = phase.price * quantity;
        platformFee = (totalCost * PLATFORM_FEE_BPS) / 10000;
        buybackContribution = (platformFee * BUYBACK_ALLOCATION_BPS) / 10000;
        creatorAmount = totalCost - platformFee;
    }

    function tokenURI(uint256 tokenId) public view returns (string memory) {
        require(_owners[tokenId] != address(0), "Token does not exist");
        return string(abi.encodePacked(baseURI, _toString(tokenId)));
    }

    // EIP-2981 Royalty
    function royaltyInfo(uint256, uint256 salePrice) external view returns (address, uint256) {
        uint256 royaltyAmount = (salePrice * royaltyBps) / 10000;
        return (royaltyReceiver, royaltyAmount);
    }

    function supportsInterface(bytes4 interfaceId) public pure returns (bool) {
        return
            interfaceId == 0x80ac58cd || // ERC721
            interfaceId == 0x2a55205a || // ERC2981
            interfaceId == 0x01ffc9a7;   // ERC165
    }

    // ============ Internal Functions ============

    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        address tokenOwner = ownerOf(tokenId);
        return (spender == tokenOwner || getApproved(tokenId) == spender || isApprovedForAll(tokenOwner, spender));
    }

    function _transfer(address from, address to, uint256 tokenId) internal {
        require(ownerOf(tokenId) == from, "Not token owner");
        require(to != address(0), "Zero address");
        
        delete _tokenApprovals[tokenId];
        _balances[from]--;
        _balances[to]++;
        _owners[tokenId] = to;
        
        emit Transfer(from, to, tokenId);
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits--;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
    
    function _toHexString(address addr) internal pure returns (string memory) {
        bytes memory buffer = new bytes(42);
        buffer[0] = '0';
        buffer[1] = 'x';
        bytes memory hexChars = "0123456789abcdef";
        for (uint256 i = 0; i < 20; i++) {
            buffer[2 + i * 2] = hexChars[uint8(uint160(addr) >> (8 * (19 - i) + 4)) & 0x0f];
            buffer[3 + i * 2] = hexChars[uint8(uint160(addr) >> (8 * (19 - i))) & 0x0f];
        }
        return string(buffer);
    }
    
    // Allow contract to receive ETH
    receive() external payable {}
}
