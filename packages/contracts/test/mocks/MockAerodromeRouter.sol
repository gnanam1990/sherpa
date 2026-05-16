// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAerodromeRouter} from "../../src/interfaces/IAerodromeRouter.sol";

/// @title MockAerodromeRouter
/// @notice A mock Aerodrome router for testing purposes
contract MockAerodromeRouter {
    uint256 public fixedOutputAmount;

    /// @notice Sets a fixed output amount for testing
    /// @param amount The fixed output amount
    function setFixedOutputAmount(uint256 amount) external {
        fixedOutputAmount = amount;
    }

    /// @notice Mock swap implementation
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256,
        IAerodromeRouter.Route[] calldata,
        address to,
        uint256
    ) external returns (uint256[] memory amounts) {
        amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = fixedOutputAmount > 0 ? fixedOutputAmount : amountIn;

        if (to != address(0)) {
            // In a real mock we'd transfer tokens, but for unit tests
            // the caller manages token balances
        }
    }

    /// @notice Mock getAmountsOut implementation
    function getAmountsOut(
        uint256 amountIn,
        IAerodromeRouter.Route[] calldata
    ) external view returns (uint256[] memory amounts) {
        amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = fixedOutputAmount > 0 ? fixedOutputAmount : amountIn;
    }

    /// @notice Mock quoteAddLiquidity implementation
    function quoteAddLiquidity(
        address,
        address,
        bool,
        uint256 amountA,
        uint256 amountB
    ) external pure returns (uint256, uint256, uint256) {
        return (amountA, amountB, (amountA + amountB) / 2);
    }
}
