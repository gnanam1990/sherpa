// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IAavePool
/// @notice Interface for Aave V3 Pool
interface IAavePool {
    /// @notice Supplies an `amount` of underlying asset into the reserve,
    /// @param asset The address of the underlying asset to supply
    /// @param amount The amount to be supplied
    /// @param onBehalfOf The address that will receive the aTokens
    /// @param referralCode Code used to register the integrator (0 if none)
    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external;

    /// @notice Withdraws an `amount` of underlying asset from the reserve
    /// @param asset The address of the underlying asset to withdraw
    /// @param amount The amount to be withdrawn (use type(uint256).max for full balance)
    /// @param to The address that will receive the underlying asset
    /// @return The final amount withdrawn
    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256);

    /// @notice Borrows an `amount` of underlying asset from the reserve
    /// @param asset The address of the underlying asset to borrow
    /// @param amount The amount to be borrowed
    /// @param interestRateMode The interest rate mode (1 = stable, 2 = variable)
    /// @param referralCode Code used to register the integrator (0 if none)
    /// @param onBehalfOf The address that will receive the debt
    function borrow(
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        uint16 referralCode,
        address onBehalfOf
    ) external;

    /// @notice Repays a borrowed `amount` on a reserve
    /// @param asset The address of the borrowed underlying asset
    /// @param amount The amount to repay (use type(uint256).max for full debt)
    /// @param interestRateMode The interest rate mode (1 = stable, 2 = variable)
    /// @param onBehalfOf The address for which to repay the debt
    /// @return The final amount repaid
    function repay(
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        address onBehalfOf
    ) external returns (uint256);

    /// @notice Returns the user account data across all reserves
    /// @param user The address of the user
    /// @return totalCollateralBase The total collateral in base currency
    /// @return totalDebtBase The total debt in base currency
    /// @return availableBorrowsBase The borrowing power left in base currency
    /// @return currentLiquidationThreshold The liquidation threshold
    /// @return ltv The loan to value
    /// @return healthFactor The health factor
    function getUserAccountData(
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
        );

    /// @notice Returns the aToken address for a given underlying asset
    /// @param asset The underlying asset address
    /// @return The aToken address
    function getReserveAToken(address asset) external view returns (address);
}
