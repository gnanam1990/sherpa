// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/// @title FeeCalculator
/// @notice Library for fee calculations
library FeeCalculator {
    /// @notice Calculates the fee amount for a given amount and basis points
    /// @param amount The base amount to calculate the fee from
    /// @param feeBps The fee in basis points (1 bp = 0.01%)
    /// @return fee The calculated fee amount
    function calculateFee(uint256 amount, uint256 feeBps) internal pure returns (uint256 fee) {
        fee = (amount * feeBps) / 10_000;
    }

    /// @notice Returns the amount after deducting the fee
    /// @param amount The base amount
    /// @param feeBps The fee in basis points (1 bp = 0.01%)
    /// @return netAmount The amount after fee deduction
    function afterFee(uint256 amount, uint256 feeBps) internal pure returns (uint256 netAmount) {
        uint256 fee = calculateFee(amount, feeBps);
        netAmount = amount - fee;
    }
}
