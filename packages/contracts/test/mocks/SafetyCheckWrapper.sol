// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {SafetyCheck} from "../../src/libraries/SafetyCheck.sol";

/// @title SafetyCheckWrapper
/// @notice Wraps internal library functions for testing
contract SafetyCheckWrapper {
    function validateSlippage(
        uint256 slippageBps,
        uint256 minSlippageBps,
        uint256 maxSlippageBps
    ) external pure {
        SafetyCheck.validateSlippage(slippageBps, minSlippageBps, maxSlippageBps);
    }

    function validateDeadline(uint256 deadline) external view {
        SafetyCheck.validateDeadline(deadline);
    }
}
