// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IAerodromeRouter
/// @notice Interface for Aerodrome V2 Router
interface IAerodromeRouter {
    /// @notice Describes a swap route through the Aerodrome protocol
    struct Route {
        address from;
        address to;
        bool stable;
        address factory;
    }

    /// @notice Swaps an exact amount of tokens for as many output tokens as possible
    /// @param amountIn The exact amount of input tokens to send
    /// @param amountOutMin The minimum amount of output tokens to receive
    /// @param routes The swap routes to follow
    /// @param to The destination address for output tokens
    /// @param deadline The Unix timestamp after which the swap will revert
    /// @return amounts The amounts of tokens swapped at each step
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        Route[] calldata routes,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    /// @notice Returns the amounts of tokens received for a given input amount along a route
    /// @param amountIn The input token amount
    /// @param routes The swap routes to evaluate
    /// @return amounts The amounts of tokens at each step of the route
    function getAmountsOut(
        uint256 amountIn,
        Route[] calldata routes
    ) external view returns (uint256[] memory amounts);

    /// @notice Returns the amounts for adding liquidity
    /// @param tokenA The first token address
    /// @param tokenB The second token address
    /// @param stable Whether the pool is stable
    /// @param amountA The desired amount of tokenA
    /// @param amountB The desired amount of tokenB
    /// @return amountOutA The actual amount of tokenA to add
    /// @return amountOutB The actual amount of tokenB to add
    /// @return liquidity The amount of LP tokens minted
    function quoteAddLiquidity(
        address tokenA,
        address tokenB,
        bool stable,
        uint256 amountA,
        uint256 amountB
    ) external view returns (uint256 amountOutA, uint256 amountOutB, uint256 liquidity);
}
