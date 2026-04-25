// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ============================================================
//  GAMEM - Tuxuncha O'yini Smart Contract
//  Wallet: 0xB38ceA20FAd59105E19d9fbDB6343D50A35e8b0C
// ============================================================

/**
 * @title EggCoin (EGC) - Native reward token
 * @dev ERC20-compatible minimal token minted by GameM contract
 */
contract EggCoin {
    string public name = "EggCoin";
    string public symbol = "EGC";
    uint8 public decimals = 18;
    uint256 public totalSupply;

    address public minter;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Minted(address indexed to, uint256 amount);

    modifier onlyMinter() {
        require(msg.sender == minter, "Only minter");
        _;
    }

    constructor() {
        minter = msg.sender;
    }

    function setMinter(address _minter) external onlyMinter {
        minter = _minter;
    }

    function mint(address to, uint256 amount) external onlyMinter {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
        emit Minted(to, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}

/**
 * @title GameM - Tuxuncha O'yini
 * @dev Main game contract with multi-tier rewards, streaks, and bonuses
 */
contract GameM {
    // ── State Variables ──────────────────────────────────────
    address public owner;
    EggCoin public rewardToken;

    uint256 public constant CLICKS_TO_CRACK = 100;
    uint256 public constant BASE_REWARD     = 10  * 10**18; // 10 EGC
    uint256 public constant STREAK_BONUS    = 2   * 10**18; //  2 EGC per streak level
    uint256 public constant MILESTONE_BONUS = 50  * 10**18; // 50 EGC at 10/25/50/100 eggs
    uint256 public constant JACKPOT_BONUS   = 200 * 10**18; // 200 EGC jackpot (rare)
    uint256 public constant DAILY_BONUS     = 5   * 10**18; //  5 EGC first crack of the day
    uint256 public jackpotChance            = 50;           // 1-in-50 chance

    // Per-user stats
    mapping(address => uint256) public totalCracks;
    mapping(address => uint256) public pendingRewards;  // EGC earned, not yet claimed
    mapping(address => uint256) public streakCount;     // consecutive days cracked
    mapping(address => uint256) public lastCrackDay;    // Unix day of last crack
    mapping(address => uint256) public totalEarned;     // lifetime EGC earned
    mapping(address => uint256) public lastJackpotSeed; // anti-spam seed

    // Leaderboard: top crackers
    address[] public leaderboard;
    mapping(address => bool) public onLeaderboard;

    // Events
    event EggCracked(address indexed user, uint256 crackNumber, uint256 reward, bool jackpot, bool milestone, uint8 streakLevel);
    event RewardClaimed(address indexed user, uint256 amount);
    event StreakUpdated(address indexed user, uint256 streak);
    event JackpotWon(address indexed user, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    // ── Constructor ───────────────────────────────────────────
    constructor() {
        owner = msg.sender;
        // Deploy EggCoin and set this contract as the minter
        EggCoin egg = new EggCoin();
        rewardToken = egg;
        egg.setMinter(address(this));
    }

    // ── Internal helpers ─────────────────────────────────────
    function _currentDay() internal view returns (uint256) {
        return block.timestamp / 86400;
    }

    function _pseudoRandom(address user, uint256 nonce) internal view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.prevrandao, user, nonce, block.timestamp)));
    }

    function _isMilestone(uint256 crackNum) internal pure returns (bool) {
        return crackNum == 10 || crackNum == 25 || crackNum == 50 || crackNum == 100 || crackNum % 100 == 0;
    }

    // ── Core Game Function ────────────────────────────────────
    /**
     * @notice Record one egg crack and mint rewards to pendingRewards.
     * @return reward Total EGC minted this crack
     * @return isJackpot Whether jackpot was won
     * @return isMilestoneWin Whether milestone bonus applied
     * @return streak Current streak level
     */
    function recordCrack() external returns (uint256 reward, bool isJackpot, bool isMilestoneWin, uint8 streak) {
        address user = msg.sender;
        uint256 today = _currentDay();

        // ── Streak logic ──────────────────────────────────────
        uint256 lastDay = lastCrackDay[user];
        if (lastDay == 0) {
            // First ever crack
            streakCount[user] = 1;
        } else if (today == lastDay) {
            // Same day, no streak change
        } else if (today == lastDay + 1) {
            // Consecutive day
            streakCount[user] += 1;
        } else {
            // Streak broken
            streakCount[user] = 1;
        }
        lastCrackDay[user] = today;
        uint8 currentStreak = uint8(streakCount[user] > 255 ? 255 : streakCount[user]);
        emit StreakUpdated(user, currentStreak);

        // ── Increment crack count ─────────────────────────────
        totalCracks[user] += 1;
        uint256 crackNum = totalCracks[user];

        // ── Base reward ───────────────────────────────────────
        reward = BASE_REWARD;

        // ── Daily bonus (first crack of the day) ──────────────
        if (today != lastDay || lastDay == 0) {
            reward += DAILY_BONUS;
        }

        // ── Streak bonus ──────────────────────────────────────
        if (currentStreak > 1) {
            uint256 bonus = STREAK_BONUS * (currentStreak - 1);
            if (bonus > 20 * 10**18) bonus = 20 * 10**18; // cap at 20 EGC
            reward += bonus;
        }

        // ── Milestone bonus ───────────────────────────────────
        isMilestoneWin = _isMilestone(crackNum);
        if (isMilestoneWin) {
            reward += MILESTONE_BONUS;
        }

        // ── Jackpot (random) ──────────────────────────────────
        uint256 rng = _pseudoRandom(user, lastJackpotSeed[user]);
        lastJackpotSeed[user] = rng;
        isJackpot = (rng % jackpotChance == 0);
        if (isJackpot) {
            reward += JACKPOT_BONUS;
            emit JackpotWon(user, JACKPOT_BONUS);
        }

        // ── Mint & accumulate ─────────────────────────────────
        rewardToken.mint(address(this), reward);
        pendingRewards[user] += reward;
        totalEarned[user]    += reward;

        // ── Update leaderboard ────────────────────────────────
        if (!onLeaderboard[user]) {
            onLeaderboard[user] = true;
            leaderboard.push(user);
        }

        emit EggCracked(user, crackNum, reward, isJackpot, isMilestoneWin, currentStreak);
        return (reward, isJackpot, isMilestoneWin, currentStreak);
    }

    // ── Claim Rewards ─────────────────────────────────────────
    /**
     * @notice Transfer all pending EGC rewards to caller's wallet
     */
    function claimRewards() external {
        address user = msg.sender;
        uint256 amount = pendingRewards[user];
        require(amount > 0, "No pending rewards");

        pendingRewards[user] = 0;
        rewardToken.transfer(user, amount);
        emit RewardClaimed(user, amount);
    }

    // ── View functions ────────────────────────────────────────
    function getUserStats(address user) external view returns (
        uint256 cracks,
        uint256 pending,
        uint256 streak,
        uint256 earned,
        uint256 egcBalance
    ) {
        return (
            totalCracks[user],
            pendingRewards[user],
            streakCount[user],
            totalEarned[user],
            rewardToken.balanceOf(user)
        );
    }

    function getLeaderboard() external view returns (address[] memory) {
        return leaderboard;
    }

    function getLeaderboardStats(address user) external view returns (uint256 cracks, uint256 earned) {
        return (totalCracks[user], totalEarned[user]);
    }

    function tokenAddress() external view returns (address) {
        return address(rewardToken);
    }

    // ── Admin ─────────────────────────────────────────────────
    function setJackpotChance(uint256 _chance) external onlyOwner {
        require(_chance >= 10, "Too frequent");
        jackpotChance = _chance;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}
