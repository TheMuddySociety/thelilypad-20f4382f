// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.4.0
// TheLilyPad NFT Collection - ERC721 Upgradeable with per-token URI storage
pragma solidity ^0.8.27;

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC721BurnableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import {ERC721EnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import {ERC721PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721PausableUpgradeable.sol";
import {ERC721URIStorageUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title TheLilyPad
 * @dev ERC721 Upgradeable NFT contract with per-token URI storage for IPFS metadata.
 * 
 * Features:
 * - UUPS Upgradeable pattern
 * - Per-token URI storage (ERC721URIStorage)
 * - Enumerable for total supply tracking
 * - Pausable for emergency stops
 * - Burnable tokens
 * - Owner-only minting
 * 
 * Integration with LilyPad Launchpad:
 * - Token URIs are constructed as: ipfs://{CID}/{tokenId}.json
 * - The base CID is stored in the launchpad database
 * - safeMint is called with the full IPFS URI for each token
 */
contract TheLilyPad is 
    Initializable, 
    ERC721Upgradeable, 
    ERC721EnumerableUpgradeable, 
    ERC721URIStorageUpgradeable, 
    ERC721PausableUpgradeable, 
    OwnableUpgradeable, 
    ERC721BurnableUpgradeable, 
    UUPSUpgradeable 
{
    uint256 private _nextTokenId;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the contract with the given owner.
     * @param initialOwner The address that will be set as the owner of the contract.
     */
    function initialize(address initialOwner) public initializer {
        __ERC721_init("TheLilyPad", "LILY");
        __ERC721Enumerable_init();
        __ERC721URIStorage_init();
        __ERC721Pausable_init();
        __Ownable_init(initialOwner);
        __ERC721Burnable_init();
        __UUPSUpgradeable_init();
    }

    /**
     * @dev Pauses all token transfers. Only callable by the owner.
     */
    function pause() public onlyOwner {
        _pause();
    }

    /**
     * @dev Unpauses all token transfers. Only callable by the owner.
     */
    function unpause() public onlyOwner {
        _unpause();
    }

    /**
     * @dev Mints a new token with the given URI.
     * @param to The address that will receive the minted token.
     * @param uri The IPFS URI for the token metadata (e.g., ipfs://CID/0.json).
     * @return tokenId The ID of the newly minted token.
     * 
     * Called by the LilyPad launchpad with URIs constructed as:
     * ipfs://{collection.ipfs_base_cid}/{tokenId}.json
     */
    function safeMint(address to, string memory uri)
        public
        onlyOwner
        returns (uint256)
    {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        return tokenId;
    }

    /**
     * @dev Authorizes contract upgrades. Only callable by the owner.
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {}

    // The following functions are overrides required by Solidity.

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable, ERC721PausableUpgradeable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
    {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable, ERC721URIStorageUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
