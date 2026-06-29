// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/// @title SafetyCheck
/// @notice Library for slippage and deadline validation
library SafetyCheck {
    error InvalidSlippage(uint256 slippageBps, uint256 min, uint256 max);
    error DeadlineExpired(uint256 deadline, uint256 currentTime);

    /// @notice Validates that slippage is within acceptable bounds
    /// @param slippageBps The slippage in basis points
    /// @param minSlippageBps The minimum allowed slippage in basis points
    /// @param maxSlippageBps The maximum allowed slippage in basis points
    function validateSlippage(
        uint256 slippageBps,
        uint256 minSlippageBps,
        uint256 maxSlippageBps
    ) internal pure {
        if (slippageBps < minSlippageBps || slippageBps > maxSlippageBps) {
            revert InvalidSlippage(slippageBps, minSlippageBps, maxSlippageBps);
        }
    }

    /// @notice Validates that a deadline has not passed
    /// @param deadline The Unix timestamp deadline
    function validateDeadline(uint256 deadline) internal view {
        if (block.timestamp > deadline) {
            revert DeadlineExpired(deadline, block.timestamp);
        }
    }
}
