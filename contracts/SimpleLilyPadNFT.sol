// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SimpleLilyPadNFT
 * @notice Simplified ERC721 NFT collection for LilyPad platform
 * @dev Minimal implementation avoiding stack-too-deep errors
 */
contract SimpleLilyPadNFT {
    // Platform identification
    string public constant PLATFORM_NAME = "LilyPad";
    string public constant VERSION = "1.0.0";
    
    // ERC721 storage
    string public name;
    string public symbol;
    uint256 public totalSupply;
    uint256 public maxSupply;
    string public baseURI;
    
    // Ownership
    address public owner;
    address public factory;
    
    // Platform addresses
    address public platformTreasury;
    address public buybackPool;
    
    // Royalty info (ERC2981)
    uint256 public royaltyBps;
    address public royaltyReceiver;
    
    // Token data
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;
    
    // Phase system
    struct Phase {
        uint256 price;
        uint256 maxPerWallet;
        uint256 maxSupply;
        uint256 minted;
        bool isActive;
    }
    
    uint256 public activePhase;
    mapping(uint256 => Phase) public phases;
    mapping(uint256 => mapping(address => bool)) public allowlisted;
    mapping(uint256 => mapping(address => uint256)) public mintedPerPhase;
    
    // Fee constants (in basis points)
    uint256 public constant PLATFORM_FEE_BPS = 250; // 2.5%
    uint256 public constant BUYBACK_SPLIT_BPS = 5000; // 50% of platform fee
    
    // Events
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event LilyPadCollectionCreated(address indexed collection, string name, address creator);
    event PhaseConfigured(uint256 indexed phaseId, uint256 price, uint256 maxPerWallet);
    event Minted(address indexed to, uint256 indexed tokenId, uint256 phaseId);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _maxSupply,
        uint256 _royaltyBps,
        address _royaltyReceiver,
        address _owner,
        address _treasury,
        address _buyback
    ) {
        name = _name;
        symbol = _symbol;
        maxSupply = _maxSupply;
        royaltyBps = _royaltyBps;
        royaltyReceiver = _royaltyReceiver;
        owner = _owner;
        factory = msg.sender;
        platformTreasury = _treasury;
        buybackPool = _buyback;
        
        emit LilyPadCollectionCreated(address(this), _name, _owner);
    }
    
    // Platform verification
    function isLilyPadCollection() external pure returns (bool) {
        return true;
    }
    
    function getPlatformInfo() external view returns (
        string memory platform,
        string memory version,
        address treasury,
        address buyback
    ) {
        return (PLATFORM_NAME, VERSION, platformTreasury, buybackPool);
    }
    
    function getFeeInfo() external view returns (
        uint256 platformFeeBps,
        uint256 buybackSplitBps,
        address treasury,
        address buyback
    ) {
        return (PLATFORM_FEE_BPS, BUYBACK_SPLIT_BPS, platformTreasury, buybackPool);
    }
    
    // ERC721 Core
    function balanceOf(address account) public view returns (uint256) {
        require(account != address(0), "Zero address");
        return _balances[account];
    }
    
    function ownerOf(uint256 tokenId) public view returns (address) {
        address tokenOwner = _owners[tokenId];
        require(tokenOwner != address(0), "Token doesn't exist");
        return tokenOwner;
    }
    
    function approve(address to, uint256 tokenId) external {
        address tokenOwner = ownerOf(tokenId);
        require(msg.sender == tokenOwner || _operatorApprovals[tokenOwner][msg.sender], "Not authorized");
        _tokenApprovals[tokenId] = to;
        emit Approval(tokenOwner, to, tokenId);
    }
    
    function getApproved(uint256 tokenId) public view returns (address) {
        require(_owners[tokenId] != address(0), "Token doesn't exist");
        return _tokenApprovals[tokenId];
    }
    
    function setApprovalForAll(address operator, bool approved) external {
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
    
    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        transferFrom(from, to, tokenId);
    }
    
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory) external {
        transferFrom(from, to, tokenId);
    }
    
    // Minting
    function mint(uint256 quantity, bytes32[] calldata) external payable {
        _mintInternal(msg.sender, quantity, true);
    }
    
    function mintPublic(uint256 quantity) external payable {
        _mintInternal(msg.sender, quantity, false);
    }
    
    function _mintInternal(address to, uint256 quantity, bool checkAllowlist) internal {
        Phase storage phase = phases[activePhase];
        require(phase.isActive, "Phase not active");
        require(totalSupply + quantity <= maxSupply, "Exceeds max supply");
        require(phase.minted + quantity <= phase.maxSupply, "Exceeds phase supply");
        
        if (checkAllowlist && phase.maxPerWallet > 0) {
            require(allowlisted[activePhase][to], "Not allowlisted");
        }
        
        uint256 minted = mintedPerPhase[activePhase][to];
        if (phase.maxPerWallet > 0) {
            require(minted + quantity <= phase.maxPerWallet, "Exceeds wallet limit");
        }
        
        uint256 totalCost = phase.price * quantity;
        require(msg.value >= totalCost, "Insufficient payment");
        
        // Mint tokens
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = totalSupply + 1;
            _owners[tokenId] = to;
            totalSupply++;
            emit Transfer(address(0), to, tokenId);
            emit Minted(to, tokenId, activePhase);
        }
        
        _balances[to] += quantity;
        phase.minted += quantity;
        mintedPerPhase[activePhase][to] = minted + quantity;
        
        // Refund excess
        if (msg.value > totalCost) {
            payable(to).transfer(msg.value - totalCost);
        }
    }
    
    // Phase management
    function configurePhase(
        uint256 phaseId,
        uint256 price,
        uint256 maxPerWallet,
        uint256 phaseMaxSupply
    ) external onlyOwner {
        phases[phaseId] = Phase({
            price: price,
            maxPerWallet: maxPerWallet,
            maxSupply: phaseMaxSupply > 0 ? phaseMaxSupply : maxSupply,
            minted: phases[phaseId].minted,
            isActive: false
        });
        emit PhaseConfigured(phaseId, price, maxPerWallet);
    }
    
    function setActivePhase(uint256 phaseId) external onlyOwner {
        phases[activePhase].isActive = false;
        activePhase = phaseId;
        phases[phaseId].isActive = true;
    }
    
    function setAllowlist(uint256 phaseId, address[] calldata addresses, bool status) external onlyOwner {
        for (uint256 i = 0; i < addresses.length; i++) {
            allowlisted[phaseId][addresses[i]] = status;
        }
    }
    
    // Metadata
    function setBaseURI(string memory _baseURI) external onlyOwner {
        baseURI = _baseURI;
    }
    
    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(_owners[tokenId] != address(0), "Token doesn't exist");
        return string(abi.encodePacked(baseURI, _toString(tokenId)));
    }
    
    // View functions
    function getPhase(uint256 phaseId) external view returns (
        uint256 price,
        uint256 maxPerWallet,
        uint256 phaseMaxSupply,
        uint256 minted,
        bool isActive
    ) {
        Phase storage p = phases[phaseId];
        return (p.price, p.maxPerWallet, p.maxSupply, p.minted, p.isActive);
    }
    
    function calculateFees(uint256 quantity) external view returns (
        uint256 totalCost,
        uint256 platformFee,
        uint256 buybackAmount,
        uint256 creatorAmount
    ) {
        Phase storage p = phases[activePhase];
        totalCost = p.price * quantity;
        platformFee = (totalCost * PLATFORM_FEE_BPS) / 10000;
        buybackAmount = (platformFee * BUYBACK_SPLIT_BPS) / 10000;
        creatorAmount = totalCost - platformFee;
    }
    
    // ERC2981 Royalty
    function royaltyInfo(uint256, uint256 salePrice) external view returns (address, uint256) {
        uint256 royaltyAmount = (salePrice * royaltyBps) / 10000;
        return (royaltyReceiver, royaltyAmount);
    }
    
    // ERC165
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == 0x80ac58cd || // ERC721
            interfaceId == 0x2a55205a || // ERC2981
            interfaceId == 0x01ffc9a7;   // ERC165
    }
    
    // Owner functions
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance");
        
        // Calculate fees
        uint256 platformFee = (balance * PLATFORM_FEE_BPS) / 10000;
        uint256 buybackAmount = (platformFee * BUYBACK_SPLIT_BPS) / 10000;
        uint256 treasuryAmount = platformFee - buybackAmount;
        uint256 creatorAmount = balance - platformFee;
        
        // Distribute
        if (treasuryAmount > 0) payable(platformTreasury).transfer(treasuryAmount);
        if (buybackAmount > 0) payable(buybackPool).transfer(buybackAmount);
        if (creatorAmount > 0) payable(owner).transfer(creatorAmount);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }
    
    // Internal
    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        address tokenOwner = ownerOf(tokenId);
        return (spender == tokenOwner || getApproved(tokenId) == spender || isApprovedForAll(tokenOwner, spender));
    }
    
    function _transfer(address from, address to, uint256 tokenId) internal {
        require(ownerOf(tokenId) == from, "Not owner");
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
            buffer[digits] = bytes1(uint8(48 + value % 10));
            value /= 10;
        }
        return string(buffer);
    }
    
    receive() external payable {}
}
