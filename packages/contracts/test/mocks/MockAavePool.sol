// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAavePool} from "../../src/interfaces/IAavePool.sol";

/// @title MockAavePool
/// @notice A mock Aave V3 pool for testing purposes
contract MockAavePool {
    uint256 public mockHealthFactor = 2e18;
    uint256 public mockTotalCollateral = 1000e8;
    uint256 public mockTotalDebt;
    uint256 public mockAvailableBorrows = 500e8;
    uint256 public mockLiquidationThreshold = 8000;
    uint256 public mockLtv = 7500;

    mapping(address => uint256) public supplied;
    mapping(address => uint256) public borrowed;

    /// @notice Sets mock health factor for testing
    /// @param healthFactor The health factor value
    function setMockHealthFactor(uint256 healthFactor) external {
        mockHealthFactor = healthFactor;
    }

    /// @notice Sets mock collateral data for testing
    /// @param totalCollateral The total collateral value
    /// @param totalDebt The total debt value
    /// @param availableBorrows The available borrows value
    function setMockAccountData(
        uint256 totalCollateral,
        uint256 totalDebt,
        uint256 availableBorrows
    ) external {
        mockTotalCollateral = totalCollateral;
        mockTotalDebt = totalDebt;
        mockAvailableBorrows = availableBorrows;
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
    function getUserAccountData(
        address
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
