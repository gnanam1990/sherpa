// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockERC20
/// @notice A mock ERC20 token for testing purposes
contract MockERC20 is ERC20 {
    uint8 private _decimals;

    /// @param name The token name
    /// @param symbol The token symbol
    /// @param decimals_ The number of decimals
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_
    ) ERC20(name, symbol) {
        _decimals = decimals_;
    }

    /// @notice Returns the number of decimals
    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    /// @notice Mints tokens to a specified address
    /// @param to The recipient address
    /// @param amount The amount to mint
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /// @notice Burns tokens from a specified address
    /// @param from The address to burn from
    /// @param amount The amount to burn
    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
}
