// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IAaveOracle
/// @notice Interface for Aave V3 Oracle
interface IAaveOracle {
    /// @notice Returns the price of an asset in base currency
    /// @param asset The address of the asset
    /// @return The price of the asset
    function getAssetPrice(address asset) external view returns (uint256);

    /// @notice Returns the prices of multiple assets in base currency
    /// @param assets The addresses of the assets
    /// @return The prices of the assets
    function getAssetsPrices(address[] calldata assets) external view returns (uint256[] memory);

    /// @notice Returns the base currency address
    /// @return The base currency address (0 for USD)
    function BASE_CURRENCY() external view returns (address);

    /// @notice Returns the base currency unit
    /// @return The base currency unit (e.g., 1e8 for USD with 8 decimals)
    function BASE_CURRENCY_UNIT() external view returns (uint256);
}
