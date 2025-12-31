// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BuybackController
 * @dev Manages the buyback pool and executes buybacks based on volume thresholds
 * @notice Central controller for The Lily Pad ecosystem buyback mechanics
 * @custom:platform The Lily Pad
 * @custom:website https://TheLilyPad.Fun
 */
contract BuybackController {
    // ============ Configuration ============
    
    string public constant VERSION = "1.0.0";
    
    /// @notice Default buyback threshold (100 MON)
    uint256 public buybackThreshold = 100 ether;
    
    /// @notice Minimum time between buybacks (1 hour)
    uint256 public constant MIN_BUYBACK_INTERVAL = 1 hours;
    
    // ============ State Variables ============
    
    address public owner;
    address public executor; // Can trigger buybacks
    bool public isActive;
    
    // Pool state
    uint256 public poolBalance;
    uint256 public accumulatedVolume;
    uint256 public lastBuybackTimestamp;
    uint256 public totalBuybacksExecuted;
    uint256 public totalMonSpent;
    uint256 public totalTokensBought;
    
    // Volume tracking by source
    struct VolumeSource {
        uint256 totalVolume;
        uint256 weight; // in basis points (10000 = 100%)
        bool isActive;
    }
    
    mapping(string => VolumeSource) public volumeSources;
    string[] public sourceTypes;
    
    // Authorized callers (marketplace, shop, etc.)
    mapping(address => bool) public authorizedCallers;
    
    // Buyback history
    struct BuybackRecord {
        uint256 monSpent;
        uint256 tokensBought;
        uint256 triggerVolume;
        uint256 timestamp;
        address tokenAddress;
    }
    
    BuybackRecord[] public buybackHistory;
    
    // ============ Events ============
    
    event VolumeAdded(
        string indexed sourceType,
        uint256 amount,
        uint256 weightedAmount,
        uint256 newAccumulatedVolume
    );
    
    event BuybackTriggered(
        uint256 poolBalance,
        uint256 accumulatedVolume,
        uint256 threshold
    );
    
    event BuybackExecuted(
        uint256 indexed buybackId,
        uint256 monSpent,
        uint256 tokensBought,
        address tokenAddress
    );
    
    event FundsReceived(address indexed from, uint256 amount);
    
    event ThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    
    event VolumeSourceConfigured(string sourceType, uint256 weight, bool isActive);
    
    event CallerAuthorized(address indexed caller, bool authorized);
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyAuthorized() {
        require(
            authorizedCallers[msg.sender] || msg.sender == owner || msg.sender == executor,
            "Not authorized"
        );
        _;
    }
    
    modifier onlyExecutor() {
        require(msg.sender == executor || msg.sender == owner, "Not executor");
        _;
    }
    
    modifier whenActive() {
        require(isActive, "Controller paused");
        _;
    }
    
    // ============ Constructor ============
    
    constructor() {
        owner = msg.sender;
        executor = msg.sender;
        isActive = true;
        
        // Initialize volume source weights
        _configureVolumeSource("nft_sell", 10000, true);    // 100% weight
        _configureVolumeSource("nft_buy", 10000, true);     // 100% weight
        _configureVolumeSource("offer", 5000, true);        // 50% weight (only when accepted)
        _configureVolumeSource("listing", 2500, true);      // 25% weight
        _configureVolumeSource("sticker", 10000, true);     // 100% weight
        _configureVolumeSource("emote", 10000, true);       // 100% weight
        _configureVolumeSource("emoji", 10000, true);       // 100% weight
    }
    
    // ============ Volume Functions ============
    
    /**
     * @notice Add volume from a source
     * @param sourceType The type of volume source
     * @param amount The raw volume amount
     */
    function addVolume(string calldata sourceType, uint256 amount) external onlyAuthorized whenActive {
        VolumeSource storage source = volumeSources[sourceType];
        require(source.isActive, "Source not active");
        require(amount > 0, "Amount must be > 0");
        
        // Calculate weighted volume
        uint256 weightedAmount = (amount * source.weight) / 10000;
        
        // Update totals
        source.totalVolume += amount;
        accumulatedVolume += weightedAmount;
        
        emit VolumeAdded(sourceType, amount, weightedAmount, accumulatedVolume);
        
        // Check if buyback threshold reached
        if (accumulatedVolume >= buybackThreshold && poolBalance > 0) {
            emit BuybackTriggered(poolBalance, accumulatedVolume, buybackThreshold);
        }
    }
    
    /**
     * @notice Check if buyback conditions are met
     */
    function canExecuteBuyback() public view returns (bool) {
        return isActive &&
               poolBalance > 0 &&
               accumulatedVolume >= buybackThreshold &&
               block.timestamp >= lastBuybackTimestamp + MIN_BUYBACK_INTERVAL;
    }
    
    /**
     * @notice Execute a buyback
     * @param tokenAddress The token to buy (address(0) for native token burn)
     * @param minTokensOut Minimum tokens to receive (slippage protection)
     */
    function executeBuyback(
        address tokenAddress,
        uint256 minTokensOut
    ) external onlyExecutor whenActive returns (uint256 buybackId) {
        require(canExecuteBuyback(), "Buyback conditions not met");
        
        uint256 amountToSpend = poolBalance;
        
        // For now, we track the buyback but actual DEX integration
        // would happen here in production
        uint256 tokensBought = 0;
        
        // If tokenAddress is address(0), this is a "burn" buyback
        // Otherwise, would integrate with DEX to swap
        if (tokenAddress != address(0)) {
            // In production: integrate with DEX
            // tokensBought = DEX.swap(amountToSpend, tokenAddress, minTokensOut);
            tokensBought = minTokensOut; // Placeholder
        }
        
        // Update state
        poolBalance = 0;
        accumulatedVolume = 0;
        lastBuybackTimestamp = block.timestamp;
        totalBuybacksExecuted++;
        totalMonSpent += amountToSpend;
        totalTokensBought += tokensBought;
        
        // Record buyback
        buybackId = buybackHistory.length;
        buybackHistory.push(BuybackRecord({
            monSpent: amountToSpend,
            tokensBought: tokensBought,
            triggerVolume: buybackThreshold,
            timestamp: block.timestamp,
            tokenAddress: tokenAddress
        }));
        
        emit BuybackExecuted(buybackId, amountToSpend, tokensBought, tokenAddress);
        
        return buybackId;
    }
    
    // ============ View Functions ============
    
    function getPoolStatus() external view returns (
        uint256 balance,
        uint256 volume,
        uint256 threshold,
        uint256 progress,
        bool canBuyback
    ) {
        balance = poolBalance;
        volume = accumulatedVolume;
        threshold = buybackThreshold;
        progress = threshold > 0 ? (volume * 10000) / threshold : 0;
        canBuyback = canExecuteBuyback();
    }
    
    function getVolumeSource(string calldata sourceType) external view returns (
        uint256 totalVolume,
        uint256 weight,
        bool isActiveStatus
    ) {
        VolumeSource storage source = volumeSources[sourceType];
        return (source.totalVolume, source.weight, source.isActive);
    }
    
    function getBuybackStats() external view returns (
        uint256 _totalBuybacksExecuted,
        uint256 _totalMonSpent,
        uint256 _totalTokensBought,
        uint256 _lastBuybackTimestamp
    ) {
        return (totalBuybacksExecuted, totalMonSpent, totalTokensBought, lastBuybackTimestamp);
    }
    
    function getBuybackHistory(uint256 startIndex, uint256 count) external view returns (BuybackRecord[] memory) {
        uint256 historyLength = buybackHistory.length;
        if (startIndex >= historyLength) {
            return new BuybackRecord[](0);
        }
        
        uint256 endIndex = startIndex + count;
        if (endIndex > historyLength) {
            endIndex = historyLength;
        }
        
        BuybackRecord[] memory records = new BuybackRecord[](endIndex - startIndex);
        for (uint256 i = startIndex; i < endIndex; i++) {
            records[i - startIndex] = buybackHistory[i];
        }
        
        return records;
    }
    
    function getSourceTypes() external view returns (string[] memory) {
        return sourceTypes;
    }
    
    // ============ Admin Functions ============
    
    function setThreshold(uint256 newThreshold) external onlyOwner {
        require(newThreshold > 0, "Threshold must be > 0");
        emit ThresholdUpdated(buybackThreshold, newThreshold);
        buybackThreshold = newThreshold;
    }
    
    function configureVolumeSource(
        string calldata sourceType,
        uint256 weight,
        bool activeStatus
    ) external onlyOwner {
        _configureVolumeSource(sourceType, weight, activeStatus);
    }
    
    function _configureVolumeSource(
        string memory sourceType,
        uint256 weight,
        bool activeStatus
    ) internal {
        require(weight <= 10000, "Weight cannot exceed 100%");
        
        VolumeSource storage source = volumeSources[sourceType];
        
        // Add to sourceTypes if new
        if (source.weight == 0 && weight > 0) {
            sourceTypes.push(sourceType);
        }
        
        source.weight = weight;
        source.isActive = activeStatus;
        
        emit VolumeSourceConfigured(sourceType, weight, activeStatus);
    }
    
    function setAuthorizedCaller(address caller, bool authorized) external onlyOwner {
        authorizedCallers[caller] = authorized;
        emit CallerAuthorized(caller, authorized);
    }
    
    function setExecutor(address newExecutor) external onlyOwner {
        require(newExecutor != address(0), "Invalid address");
        executor = newExecutor;
    }
    
    function setActive(bool _active) external onlyOwner {
        isActive = _active;
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
    
    // Emergency withdraw (only if needed)
    function emergencyWithdraw(address to) external onlyOwner {
        require(to != address(0), "Invalid address");
        uint256 balance = address(this).balance;
        poolBalance = 0;
        (bool success, ) = to.call{value: balance}("");
        require(success, "Withdraw failed");
    }
    
    // ============ Receive Functions ============
    
    receive() external payable {
        poolBalance += msg.value;
        emit FundsReceived(msg.sender, msg.value);
    }
}
