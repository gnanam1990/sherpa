// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
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

    /// @notice Mock swap implementation — pulls tokenIn from caller, sends tokenOut to recipient
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256,
        IAerodromeRouter.Route[] calldata routes,
        address to,
        uint256
    ) external returns (uint256[] memory amounts) {
        amounts = new uint256[](2);
        amounts[0] = amountIn;
        uint256 output = fixedOutputAmount > 0 ? fixedOutputAmount : amountIn;
        amounts[1] = output;

        if (routes.length > 0) {
            IERC20(routes[0].from).transferFrom(msg.sender, address(this), amountIn);
            IERC20(routes[routes.length - 1].to).transfer(to, output);
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
