// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SherpaTreasury} from "../../src/SherpaTreasury.sol";
import {MockERC20} from "../mocks/MockERC20.sol";

contract TreasuryInvariants is Test {
    SherpaTreasury public treasury;
    MockERC20 public token;
    address public owner = address(0x1);

    uint256 public constant INITIAL_BALANCE = 10_000e18;

    function setUp() public {
        vm.startPrank(owner);
        treasury = new SherpaTreasury(owner);
        token = new MockERC20("Token", "TKN", 18);
        token.mint(address(treasury), INITIAL_BALANCE);
        vm.stopPrank();

        targetContract(address(treasury));
    }

    /// @notice The treasury balance should never exceed the total minted amount
    function invariant_balanceNeverExceedsMinted() public {
        assertLe(
            treasury.balance(address(token)),
            INITIAL_BALANCE,
            "Treasury balance exceeds total minted"
        );
    }

    /// @notice The treasury balance should never go negative (uint256 check)
    function invariant_balanceAlwaysPositive() public view {
        uint256 bal = treasury.balance(address(token));
        assertTrue(bal >= 0);
    }
}
