// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title MockAavePool
/// @notice A mock Aave V3 pool for testing purposes
contract MockAavePool {
    using SafeERC20 for IERC20;

    uint256 public mockHealthFactor = 2e18;
    uint256 public mockTotalCollateral = 1000e8;
    uint256 public mockTotalDebt;
    uint256 public mockAvailableBorrows = 500e8;
    uint256 public mockLiquidationThreshold = 8000;
    uint256 public mockLtv = 7500;

    mapping(address => uint256) public supplied;
    mapping(address => uint256) public borrowed;
    mapping(address => address) public reserveAToken;

    /// @notice Sets mock health factor for testing
    /// @param healthFactor The health factor value
    function setMockHealthFactor(uint256 healthFactor) external {
        mockHealthFactor = healthFactor;
    }

    /// @notice Sets mock collateral data for testing
    /// @param totalCollateral The total collateral value
    /// @param totalDebt The total debt value
    /// @param availableBorrows The available borrows value
    function setMockAccountData(uint256 totalCollateral, uint256 totalDebt, uint256 availableBorrows) external {
        mockTotalCollateral = totalCollateral;
        mockTotalDebt = totalDebt;
        mockAvailableBorrows = availableBorrows;
    }

    /// @notice Sets mock borrowed amount for an asset (for testing repay)
    /// @param asset The asset address
    /// @param amount The borrowed amount to preset
    function setBorrowed(address asset, uint256 amount) external {
        borrowed[asset] = amount;
    }

    /// @notice Sets mock aToken address for an asset
    /// @param asset The underlying asset address
    /// @param aToken The aToken address
    function setReserveAToken(address asset, address aToken) external {
        reserveAToken[asset] = aToken;
    }

    /// @notice Mock Aave V3 getReserveData implementation.
    /// @dev Returns the same static layout position used by the real Pool:
    ///      aTokenAddress is the ninth word in the reserve data tuple.
    function getReserveData(address asset)
        external
        view
        returns (
            uint256 configuration,
            uint128 liquidityIndex,
            uint128 currentLiquidityRate,
            uint128 variableBorrowIndex,
            uint128 currentVariableBorrowRate,
            uint128 currentStableBorrowRate,
            uint40 lastUpdateTimestamp,
            uint16 id,
            address aTokenAddress,
            address stableDebtTokenAddress,
            address variableDebtTokenAddress,
            address interestRateStrategyAddress,
            uint128 accruedToTreasury,
            uint128 unbacked,
            uint128 isolationModeTotalDebt
        )
    {
        return (0, 0, 0, 0, 0, 0, 0, 0, reserveAToken[asset], address(0), address(0), address(0), 0, 0, 0);
    }

    /// @notice Mock supply implementation
    function supply(address asset, uint256 amount, address, uint16) external {
        supplied[asset] += amount;
    }

    /// @notice Mock withdraw implementation
    function withdraw(address asset, uint256 amount, address) external returns (uint256) {
        if (amount > supplied[asset]) {
            amount = supplied[asset];
        }
        supplied[asset] -= amount;
        return amount;
    }

    /// @notice Mock borrow implementation
    function borrow(address asset, uint256 amount, uint256, uint16, address) external {
        borrowed[asset] += amount;
        IERC20(asset).safeTransfer(msg.sender, amount);
    }

    /// @notice Mock repay implementation
    function repay(address asset, uint256 amount, uint256, address) external returns (uint256) {
        if (amount > borrowed[asset]) {
            amount = borrowed[asset];
        }
        borrowed[asset] -= amount;
        return amount;
    }

    /// @notice Mock getUserAccountData implementation
    function getUserAccountData(address)
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
        return (
            mockTotalCollateral,
            mockTotalDebt,
            mockAvailableBorrows,
            mockLiquidationThreshold,
            mockLtv,
            mockHealthFactor
        );
    }
}
