// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SherpaTreasury} from "../src/SherpaTreasury.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract SherpaTreasuryTest is Test {
    SherpaTreasury public treasury;
    MockERC20 public tokenA;
    MockERC20 public tokenB;

    address public owner = address(0x1);
    address public nonOwner = address(0x2);
    address public recipient = address(0x3);

    function setUp() public {
        vm.startPrank(owner);
        treasury = new SherpaTreasury(owner);
        tokenA = new MockERC20("Token A", "TKA", 18);
        tokenB = new MockERC20("Token B", "TKB", 6);

        tokenA.mint(address(treasury), 1000e18);
        tokenB.mint(address(treasury), 5000e6);
        vm.stopPrank();
    }

    // ─── Constructor Tests ──────────────────────────────────────────────

    function test_constructor_setsOwner() public view {
        assertEq(treasury.owner(), owner);
    }

    function test_constructor_rejectsZeroOwner() public {
        vm.expectRevert();
        new SherpaTreasury(address(0));
    }

    // ─── Withdraw Tests ─────────────────────────────────────────────────

    function test_withdraw_transfersTokens() public {
        vm.startPrank(owner);
        treasury.withdraw(address(tokenA), recipient, 100e18);
        assertEq(tokenA.balanceOf(recipient), 100e18);
        assertEq(tokenA.balanceOf(address(treasury)), 900e18);
        vm.stopPrank();
    }

    function test_withdraw_emitsEvent() public {
        vm.startPrank(owner);
        vm.expectEmit(true, true, false, true);
        emit SherpaTreasury.Withdrawn(address(tokenA), recipient, 100e18);
        treasury.withdraw(address(tokenA), recipient, 100e18);
        vm.stopPrank();
    }

    function test_withdraw_revertsForNonOwner() public {
        vm.prank(nonOwner);
        vm.expectRevert();
        treasury.withdraw(address(tokenA), recipient, 100e18);
    }

    function test_withdraw_revertsZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(SherpaTreasury.ZeroAddress.selector);
        treasury.withdraw(address(tokenA), address(0), 100e18);
    }

    function test_withdraw_revertsZeroAmount() public {
        vm.prank(owner);
        vm.expectRevert(SherpaTreasury.ZeroAmount.selector);
        treasury.withdraw(address(tokenA), recipient, 0);
    }

    function test_withdraw_revertsInsufficientBalance() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(SherpaTreasury.InsufficientBalance.selector, 2000e18, 1000e18));
        treasury.withdraw(address(tokenA), recipient, 2000e18);
    }

    function test_withdraw_fullBalance() public {
        vm.startPrank(owner);
        treasury.withdraw(address(tokenA), recipient, 1000e18);
        assertEq(tokenA.balanceOf(recipient), 1000e18);
        assertEq(tokenA.balanceOf(address(treasury)), 0);
        vm.stopPrank();
    }

    // ─── Batch Withdraw Tests ───────────────────────────────────────────

    function testBatchWithdraw_transfersMultipleTokens() public {
        address[] memory tokens = new address[](2);
        tokens[0] = address(tokenA);
        tokens[1] = address(tokenB);

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 500e18;
        amounts[1] = 2000e6;

        vm.prank(owner);
        treasury.batchWithdraw(tokens, recipient, amounts);

        assertEq(tokenA.balanceOf(recipient), 500e18);
        assertEq(tokenB.balanceOf(recipient), 2000e6);
    }

    function testBatchWithdraw_emitsEvents() public {
        address[] memory tokens = new address[](2);
        tokens[0] = address(tokenA);
        tokens[1] = address(tokenB);

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 500e18;
        amounts[1] = 2000e6;

        vm.startPrank(owner);
        vm.expectEmit(true, true, false, true);
        emit SherpaTreasury.Withdrawn(address(tokenA), recipient, 500e18);
        vm.expectEmit(true, true, false, true);
        emit SherpaTreasury.Withdrawn(address(tokenB), recipient, 2000e6);
        treasury.batchWithdraw(tokens, recipient, amounts);
        vm.stopPrank();
    }

    function testBatchWithdraw_revertsLengthMismatch() public {
        address[] memory tokens = new address[](2);
        tokens[0] = address(tokenA);
        tokens[1] = address(tokenB);

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 500e18;

        vm.prank(owner);
        vm.expectRevert(SherpaTreasury.LengthMismatch.selector);
        treasury.batchWithdraw(tokens, recipient, amounts);
    }

    function testBatchWithdraw_revertsZeroAddress() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(tokenA);

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 500e18;

        vm.prank(owner);
        vm.expectRevert(SherpaTreasury.ZeroAddress.selector);
        treasury.batchWithdraw(tokens, address(0), amounts);
    }

    function testBatchWithdraw_revertsZeroAmount() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(tokenA);

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 0;

        vm.prank(owner);
        vm.expectRevert(SherpaTreasury.ZeroAmount.selector);
        treasury.batchWithdraw(tokens, recipient, amounts);
    }

    function testBatchWithdraw_revertsInsufficientBalance() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(tokenA);

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 2000e18;

        vm.prank(owner);
        vm.expectRevert();
        treasury.batchWithdraw(tokens, recipient, amounts);
    }

    function testBatchWithdraw_revertsForNonOwner() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(tokenA);

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100e18;

        vm.prank(nonOwner);
        vm.expectRevert();
        treasury.batchWithdraw(tokens, recipient, amounts);
    }

    function testBatchWithdraw_revertsWhenBatchTooLarge() public {
        uint256 tooMany = treasury.MAX_BATCH_WITHDRAW_TOKENS() + 1;
        address[] memory tokens = new address[](tooMany);
        uint256[] memory amounts = new uint256[](tooMany);

        for (uint256 i = 0; i < tooMany;) {
            tokens[i] = address(tokenA);
            amounts[i] = 1;
            unchecked {
                ++i;
            }
        }

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(SherpaTreasury.BatchTooLarge.selector, tooMany, 20));
        treasury.batchWithdraw(tokens, recipient, amounts);
    }

    function testBatchWithdraw_emptyArrays() public {
        address[] memory tokens = new address[](0);
        uint256[] memory amounts = new uint256[](0);

        vm.prank(owner);
        treasury.batchWithdraw(tokens, recipient, amounts);
    }

    // ─── Balance Tests ──────────────────────────────────────────────────

    function test_balance_returnsCorrectBalance() public view {
        assertEq(treasury.balance(address(tokenA)), 1000e18);
        assertEq(treasury.balance(address(tokenB)), 5000e6);
    }

    function test_balance_returnsZeroForUnknown() public {
        vm.prank(owner);
        MockERC20 tokenC = new MockERC20("Token C", "TKC", 18);
        assertEq(treasury.balance(address(tokenC)), 0);
    }

    function test_balance_updatesAfterWithdraw() public {
        vm.prank(owner);
        treasury.withdraw(address(tokenA), recipient, 300e18);
        assertEq(treasury.balance(address(tokenA)), 700e18);
    }

    // ─── Ownership Tests ────────────────────────────────────────────────

    function test_transferOwnership() public {
        vm.prank(owner);
        treasury.transferOwnership(nonOwner);
        assertEq(treasury.owner(), nonOwner);
    }

    function test_renounceOwnership() public {
        vm.prank(owner);
        treasury.renounceOwnership();
        assertEq(treasury.owner(), address(0));
    }
}
