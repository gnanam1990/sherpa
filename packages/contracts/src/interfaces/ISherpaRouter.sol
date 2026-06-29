// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {IAerodromeRouter} from "./IAerodromeRouter.sol";

/// @title ISherpaRouter
/// @notice Interface for the SherpaRouter contract
interface ISherpaRouter {
    /// @notice Emitted when a swap is executed
    /// @param user The address of the user who initiated the swap
    /// @param tokenIn The address of the input token
    /// @param tokenOut The address of the output token
    /// @param amountIn The amount of input tokens
    /// @param amountOut The amount of output tokens received
    /// @param fee The fee amount collected
    /// @param builderCode The Sherpa builder attribution code
    event SwapExecuted(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 fee,
        bytes32 builderCode
    );

    /// @notice Emitted when a supply to Aave is executed
    /// @param user The address of the user
    /// @param asset The address of the supplied asset
    /// @param amount The amount supplied
    /// @param builderCode The Sherpa builder attribution code
    event SupplyExecuted(address indexed user, address indexed asset, uint256 amount, bytes32 builderCode);

    /// @notice Emitted when a withdrawal from Aave is executed
    /// @param user The address of the user
    /// @param asset The address of the withdrawn asset
    /// @param amount The amount withdrawn
    /// @param builderCode The Sherpa builder attribution code
    event WithdrawExecuted(address indexed user, address indexed asset, uint256 amount, bytes32 builderCode);

    /// @notice Emitted when a borrow from Aave is executed
    /// @param user The address of the user
    /// @param asset The address of the borrowed asset
    /// @param amount The amount borrowed
    /// @param interestRateMode The interest rate mode (1 = stable, 2 = variable)
    /// @param builderCode The Sherpa builder attribution code
    event BorrowExecuted(
        address indexed user, address indexed asset, uint256 amount, uint256 interestRateMode, bytes32 builderCode
    );

    /// @notice Emitted when a repay to Aave is executed
    /// @param user The address of the user
    /// @param asset The address of the repaid asset
    /// @param amount The amount repaid
    /// @param interestRateMode The interest rate mode (1 = stable, 2 = variable)
    /// @param builderCode The Sherpa builder attribution code
    event RepayExecuted(
        address indexed user, address indexed asset, uint256 amount, uint256 interestRateMode, bytes32 builderCode
    );

    /// @notice Emitted when a fee is collected
    /// @param user The address of the user who paid the fee
    /// @param token The address of the fee token
    /// @param amount The fee amount
    event FeeCollected(address indexed user, address indexed token, uint256 amount);

    /// @notice Emitted when a token's allowlist status is updated
    /// @param token The address of the token
    /// @param allowed Whether the token is now allowed
    event TokenAllowlistUpdated(address indexed token, bool allowed);

    /// @notice Emitted after a token allowlist batch update completes
    /// @param count The number of tokens updated
    event BatchTokenAllowlistUpdated(uint256 count);

    /// @notice Returns the user's Aave positions
    /// @param user The address of the user
    /// @return totalCollateralBase The total collateral in base currency
    /// @return totalDebtBase The total debt in base currency
    /// @return availableBorrowsBase The borrowing power left in base currency
    /// @return currentLiquidationThreshold The liquidation threshold
    /// @return ltv The loan to value
    /// @return healthFactor The health factor
    function getUserPositions(address user)
        external
        view
        returns (
            uint256 totalCollateralBase,
            uint256 totalDebtBase,
            uint256 availableBorrowsBase,
            uint256 currentLiquidationThreshold,
            uint256 ltv,
            uint256 healthFactor
        );

    /// @notice Swaps tokens via Aerodrome
    /// @param tokenIn The input token address
    /// @param tokenOut The output token address
    /// @param amountIn The input amount
    /// @param amountOutMin The minimum output amount
    /// @param routes The Aerodrome swap routes
    /// @param deadline The swap deadline
    /// @return amountOut The output amount received
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        IAerodromeRouter.Route[] calldata routes,
        uint256 deadline
    ) external returns (uint256 amountOut);

    /// @notice Supplies an asset to Aave
    /// @param asset The asset address
    /// @param amount The amount to supply
    function supply(address asset, uint256 amount) external;

    /// @notice Withdraws an asset from Aave
    /// @param asset The asset address
    /// @param amount The amount to withdraw
    function withdraw(address asset, uint256 amount) external;

    /// @notice Borrows an asset from Aave
    /// @param asset The asset address
    /// @param amount The amount to borrow
    /// @param interestRateMode The interest rate mode (1 = stable, 2 = variable)
    function borrow(address asset, uint256 amount, uint256 interestRateMode) external;

    /// @notice Repays a borrowed asset to Aave
    /// @param asset The asset address
    /// @param amount The amount to repay
    /// @param interestRateMode The interest rate mode (1 = stable, 2 = variable)
    function repay(address asset, uint256 amount, uint256 interestRateMode) external;
}
