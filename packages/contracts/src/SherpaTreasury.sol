// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title SherpaTreasury
/// @notice Manages ERC20 token holdings for the Sherpa protocol
/// @dev All token transfers use SafeERC20 for safe handling
contract SherpaTreasury is Ownable {
    using SafeERC20 for IERC20;

    /// @notice Maximum number of tokens that can be withdrawn in one batch.
    uint256 public constant MAX_BATCH_WITHDRAW_TOKENS = 20;

    /// @notice Emitted when tokens are withdrawn from the treasury
    /// @param token The address of the withdrawn token
    /// @param to The recipient address
    /// @param amount The amount withdrawn
    event Withdrawn(address indexed token, address indexed to, uint256 amount);

    /// @notice Thrown when the recipient address is the zero address
    error ZeroAddress();

    /// @notice Thrown when the withdrawal amount is zero
    error ZeroAmount();

    /// @notice Thrown when the treasury has insufficient balance
    error InsufficientBalance(uint256 requested, uint256 available);

    /// @notice Thrown when array lengths do not match
    error LengthMismatch();

    /// @notice Thrown when too many tokens are requested in one batch
    error BatchTooLarge(uint256 requested, uint256 max);

    /// @param _owner The initial owner of the contract
    constructor(address _owner) Ownable(_owner) {}

    /// @notice Withdraws a specified amount of a token from the treasury
    /// @param token The ERC20 token address to withdraw
    /// @param to The recipient address
    /// @param amount The amount to withdraw
    function withdraw(address token, address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        uint256 bal = IERC20(token).balanceOf(address(this));
        if (amount > bal) revert InsufficientBalance(amount, bal);

        IERC20(token).safeTransfer(to, amount);
        emit Withdrawn(token, to, amount);
    }

    /// @notice Withdraws multiple tokens in a single transaction
    /// @param tokens Array of ERC20 token addresses
    /// @param to The recipient address for all tokens
    /// @param amounts Array of amounts to withdraw for each token
    function batchWithdraw(address[] calldata tokens, address to, uint256[] calldata amounts) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        if (tokens.length != amounts.length) revert LengthMismatch();
        if (tokens.length > MAX_BATCH_WITHDRAW_TOKENS) revert BatchTooLarge(tokens.length, MAX_BATCH_WITHDRAW_TOKENS);

        for (uint256 i = 0; i < tokens.length;) {
            if (amounts[i] == 0) revert ZeroAmount();

            uint256 bal = IERC20(tokens[i]).balanceOf(address(this));
            if (amounts[i] > bal) revert InsufficientBalance(amounts[i], bal);

            IERC20(tokens[i]).safeTransfer(to, amounts[i]);
            emit Withdrawn(tokens[i], to, amounts[i]);

            unchecked {
                ++i;
            }
        }
    }

    /// @notice Returns the treasury's balance of a given token
    /// @param token The ERC20 token address
    /// @return The token balance held by the treasury
    function balance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
}
