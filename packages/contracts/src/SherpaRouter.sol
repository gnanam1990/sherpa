// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IAerodromeRouter} from "./interfaces/IAerodromeRouter.sol";
import {IAavePool} from "./interfaces/IAavePool.sol";
import {ISherpaRouter} from "./interfaces/ISherpaRouter.sol";
import {FeeCalculator} from "./libraries/FeeCalculator.sol";

/// @title SherpaRouter
/// @notice Core routing contract for Sherpa protocol operations
/// @dev Integrates with Aerodrome for swaps and Aave for lending
contract SherpaRouter is Ownable, ReentrancyGuard, ISherpaRouter {
    using SafeERC20 for IERC20;
    using FeeCalculator for uint256;

    // ─── Constants ──────────────────────────────────────────────────────

    /// @notice Fee in basis points (10 bps = 0.1%)
    uint256 public constant FEE_BPS = 10;

    /// @notice Maximum allowed slippage in basis points (500 bps = 5%)
    uint256 public constant MAX_SLIPPAGE_BPS = 500;

    /// @notice Minimum allowed slippage in basis points (10 bps = 0.1%)
    uint256 public constant MIN_SLIPPAGE_BPS = 10;

    /// @notice Minimum health factor for Aave positions (1.2e18 = 1.2)
    uint256 public constant MIN_HEALTH_FACTOR = 1.2e18;

    /// @notice Minimum health factor after a withdrawal when debt exists (1.5e18 = 1.5)
    uint256 public constant MIN_WITHDRAW_HEALTH_FACTOR = 1.5e18;

    /// @notice Builder attribution code for Sherpa protocol
    bytes32 public constant BUILDER_CODE = "bc_97ju6eu2";

    // ─── Immutables ─────────────────────────────────────────────────────

    /// @notice The Aerodrome V2 router address
    IAerodromeRouter public immutable AERODROME_ROUTER;

    /// @notice The Aave V3 pool address
    IAavePool public immutable AAVE_POOL;

    /// @notice The Sherpa treasury address
    address public immutable SHERPA_TREASURY;

    // ─── Storage ────────────────────────────────────────────────────────

    /// @notice Mapping of allowed swap tokens
    mapping(address => bool) public swapTokenAllowlist;

    // ─── Custom Errors ──────────────────────────────────────────────────

    /// @notice Thrown when a token is not on the allowlist
    error TokenNotAllowed(address token);

    /// @notice Thrown when slippage is out of the allowed range
    error SlippageOutOfRange(uint256 slippageBps);

    /// @notice Thrown when the caller has insufficient balance
    error InsufficientBalance(uint256 requested, uint256 available);

    /// @notice Thrown when the health factor would drop below minimum
    error UnhealthyPosition(uint256 healthFactor);

    /// @notice Thrown when the deadline has expired
    error InvalidDeadline(uint256 deadline);

    /// @notice Thrown when an invalid interest rate mode is provided
    error InvalidInterestRateMode(uint256 mode);

    /// @notice Thrown when a zero address is provided
    error ZeroAddress();

    /// @notice Thrown when a zero amount is provided
    error ZeroAmount();

    /// @notice Thrown when array lengths do not match
    error LengthMismatch();

    // ─── Constructor ────────────────────────────────────────────────────

    /// @param _owner The initial owner of the contract
    /// @param _aerodromeRouter The Aerodrome V2 router address
    /// @param _aavePool The Aave V3 pool address
    /// @param _sherpaTreasury The Sherpa treasury address
    constructor(
        address _owner,
        address _aerodromeRouter,
        address _aavePool,
        address _sherpaTreasury
    ) Ownable(_owner) {
        if (_aerodromeRouter == address(0)) revert ZeroAddress();
        if (_aavePool == address(0)) revert ZeroAddress();
        if (_sherpaTreasury == address(0)) revert ZeroAddress();

        AERODROME_ROUTER = IAerodromeRouter(_aerodromeRouter);
        AAVE_POOL = IAavePool(_aavePool);
        SHERPA_TREASURY = _sherpaTreasury;
    }

    // ─── Admin Functions ────────────────────────────────────────────────

    /// @notice Sets the allowlist status of a single token
    /// @param token The token address
    /// @param allowed Whether the token should be allowed
    function setSwapTokenAllowed(address token, bool allowed) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        swapTokenAllowlist[token] = allowed;
        emit TokenAllowlistUpdated(token, allowed);
    }

    /// @notice Sets the allowlist status of multiple tokens
    /// @param tokens Array of token addresses
    /// @param allowed Array of allowlist statuses
    function batchSetSwapTokenAllowed(
        address[] calldata tokens,
        bool[] calldata allowed
    ) external onlyOwner {
        if (tokens.length != allowed.length) revert LengthMismatch();

        for (uint256 i = 0; i < tokens.length; ) {
            if (tokens[i] == address(0)) revert ZeroAddress();
            swapTokenAllowlist[tokens[i]] = allowed[i];
            emit TokenAllowlistUpdated(tokens[i], allowed[i]);

            unchecked {
                ++i;
            }
        }
    }

    // ─── View Functions ─────────────────────────────────────────────────

    /// @notice Returns the user's Aave account positions
    /// @param user The address of the user
    /// @return totalCollateralBase The total collateral in base currency
    /// @return totalDebtBase The total debt in base currency
    /// @return availableBorrowsBase The borrowing power left in base currency
    /// @return currentLiquidationThreshold The liquidation threshold
    /// @return ltv The loan to value
    /// @return healthFactor The health factor
    function getUserPositions(
        address user
    )
        external
        view
        returns (
            uint256 totalCollateralBase,
            uint256 totalDebtBase,
            uint256 availableBorrowsBase,
            uint256 currentLiquidationThreshold,
            uint256 ltv,
            uint256 healthFactor
        )
    {
        return AAVE_POOL.getUserAccountData(user);
    }

    // ─── Core DeFi Functions ────────────────────────────────────────────

    /// @notice Swaps tokens via Aerodrome with 0.1% fee to treasury
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        IAerodromeRouter.Route[] calldata routes,
        uint256 deadline
    ) external nonReentrant returns (uint256 amountOut) {
        if (amountIn == 0) revert ZeroAmount();
        if (!swapTokenAllowlist[tokenIn]) revert TokenNotAllowed(tokenIn);
        if (!swapTokenAllowlist[tokenOut]) revert TokenNotAllowed(tokenOut);
        if (block.timestamp > deadline) revert InvalidDeadline(deadline);

        uint256 fee = amountIn.calculateFee(FEE_BPS);
        uint256 amountInAfterFee = amountIn - fee;

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).safeTransfer(SHERPA_TREASURY, fee);
        IERC20(tokenIn).forceApprove(address(AERODROME_ROUTER), amountInAfterFee);

        uint256[] memory amounts = AERODROME_ROUTER.swapExactTokensForTokens(
            amountInAfterFee,
            amountOutMin,
            routes,
            msg.sender,
            deadline
        );
        amountOut = amounts[amounts.length - 1];

        emit SwapExecuted(msg.sender, tokenIn, tokenOut, amountIn, amountOut, fee, BUILDER_CODE);
        emit FeeCollected(msg.sender, tokenIn, fee);
    }

    /// @notice Supplies an asset to Aave on behalf of the caller
    function supply(address asset, uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (!swapTokenAllowlist[asset]) revert TokenNotAllowed(asset);

        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(asset).forceApprove(address(AAVE_POOL), amount);
        AAVE_POOL.supply(asset, amount, msg.sender, 0);

        emit SupplyExecuted(msg.sender, asset, amount, BUILDER_CODE);
    }

    /// @notice Withdraws an asset from Aave back to the caller.
    /// @dev Caller must have approved the corresponding aToken to this router.
    function withdraw(address asset, uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (!swapTokenAllowlist[asset]) revert TokenNotAllowed(asset);

        address aToken = AAVE_POOL.getReserveAToken(asset);
        IERC20(aToken).safeTransferFrom(msg.sender, address(this), amount);
        AAVE_POOL.withdraw(asset, amount, msg.sender);

        (, uint256 totalDebt, , , , uint256 postHf) = AAVE_POOL.getUserAccountData(msg.sender);
        if (totalDebt > 0 && postHf < MIN_WITHDRAW_HEALTH_FACTOR) {
            revert UnhealthyPosition(postHf);
        }

        emit WithdrawExecuted(msg.sender, asset, amount, BUILDER_CODE);
    }

    /// @notice Borrows an asset from Aave on behalf of the caller.
    /// @dev Caller must have delegated credit to this router via Aave's approveDelegation.
    function borrow(address asset, uint256 amount, uint256 interestRateMode) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (!swapTokenAllowlist[asset]) revert TokenNotAllowed(asset);
        if (interestRateMode != 1 && interestRateMode != 2) revert InvalidInterestRateMode(interestRateMode);

        AAVE_POOL.borrow(asset, amount, interestRateMode, 0, msg.sender);

        (, , , , , uint256 postHf) = AAVE_POOL.getUserAccountData(msg.sender);
        if (postHf < MIN_HEALTH_FACTOR) revert UnhealthyPosition(postHf);

        emit BorrowExecuted(msg.sender, asset, amount, interestRateMode, BUILDER_CODE);
    }

    /// @notice Repays a borrowed asset to Aave on behalf of the caller
    function repay(address asset, uint256 amount, uint256 interestRateMode) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (!swapTokenAllowlist[asset]) revert TokenNotAllowed(asset);
        if (interestRateMode != 1 && interestRateMode != 2) revert InvalidInterestRateMode(interestRateMode);

        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(asset).forceApprove(address(AAVE_POOL), amount);
        uint256 repaid = AAVE_POOL.repay(asset, amount, interestRateMode, msg.sender);

        emit RepayExecuted(msg.sender, asset, repaid, interestRateMode, BUILDER_CODE);
    }
}
