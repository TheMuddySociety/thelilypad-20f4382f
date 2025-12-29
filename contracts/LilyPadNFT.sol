// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title LilyPadNFT
 * @dev ERC721 NFT contract with phases, allowlists, and royalties
 * @notice Each collection deployed by the factory is an instance of this contract
 */
contract LilyPadNFT {
    // ERC721 Events
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    
    // Custom Events
    event PhaseConfigured(uint256 indexed phaseId, uint256 price, uint256 maxPerWallet, uint256 supply);
    event Minted(address indexed to, uint256 indexed tokenId);

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
        address owner_
    ) {
        name = name_;
        symbol = symbol_;
        maxSupply = maxSupply_;
        royaltyBps = royaltyBps_;
        royaltyReceiver = royaltyReceiver_;
        owner = owner_;
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
        require(msg.value >= phase.price * quantity, "Insufficient payment");

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
}
