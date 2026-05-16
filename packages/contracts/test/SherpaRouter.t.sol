// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SherpaRouter} from "../src/SherpaRouter.sol";
import {IAerodromeRouter} from "../src/interfaces/IAerodromeRouter.sol";
import {ISherpaRouter} from "../src/interfaces/ISherpaRouter.sol";
import {MockAerodromeRouter} from "./mocks/MockAerodromeRouter.sol";
import {MockAavePool} from "./mocks/MockAavePool.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract SherpaRouterTest is Test {
    SherpaRouter public router;
    MockAerodromeRouter public mockAerodrome;
    MockAavePool public mockAave;
    MockERC20 public tokenA;
    MockERC20 public tokenB;

    address public owner = address(0x1);
    address public nonOwner = address(0x2);
    address public treasury = address(0x3);
    address public user = address(0x4);

    function setUp() public {
        vm.startPrank(owner);
        mockAerodrome = new MockAerodromeRouter();
        mockAave = new MockAavePool();
        tokenA = new MockERC20("Token A", "TKA", 18);
        tokenB = new MockERC20("Token B", "TKB", 18);

        router = new SherpaRouter(
            owner,
            address(mockAerodrome),
            address(mockAave),
            treasury
        );
        vm.stopPrank();
    }

    // ─── Constructor Tests ──────────────────────────────────────────────

    function test_constructor_setsOwner() public view {
        assertEq(router.owner(), owner);
    }

    function test_constructor_setsImmutables() public view {
        assertEq(address(router.AERODROME_ROUTER()), address(mockAerodrome));
        assertEq(address(router.AAVE_POOL()), address(mockAave));
        assertEq(router.SHERPA_TREASURY(), treasury);
    }

    function test_constructor_setsConstants() public view {
        assertEq(router.FEE_BPS(), 10);
        assertEq(router.MAX_SLIPPAGE_BPS(), 500);
        assertEq(router.MIN_SLIPPAGE_BPS(), 10);
        assertEq(router.MIN_HEALTH_FACTOR(), 1.2e18);
    }

    function test_constructor_revertsZeroAerodrome() public {
        vm.prank(owner);
        vm.expectRevert(SherpaRouter.ZeroAddress.selector);
        new SherpaRouter(owner, address(0), address(mockAave), treasury);
    }

    function test_constructor_revertsZeroAave() public {
        vm.prank(owner);
        vm.expectRevert(SherpaRouter.ZeroAddress.selector);
        new SherpaRouter(owner, address(mockAerodrome), address(0), treasury);
    }

    function test_constructor_revertsZeroTreasury() public {
        vm.prank(owner);
        vm.expectRevert(SherpaRouter.ZeroAddress.selector);
        new SherpaRouter(owner, address(mockAerodrome), address(mockAave), address(0));
    }

    // ─── Allowlist Admin Tests ──────────────────────────────────────────

    function test_setSwapTokenAllowed_setsTrue() public {
        vm.prank(owner);
        router.setSwapTokenAllowed(address(tokenA), true);
        assertTrue(router.swapTokenAllowlist(address(tokenA)));
    }

    function test_setSwapTokenAllowed_setsFalse() public {
        vm.startPrank(owner);
        router.setSwapTokenAllowed(address(tokenA), true);
        router.setSwapTokenAllowed(address(tokenA), false);
        vm.stopPrank();
        assertFalse(router.swapTokenAllowlist(address(tokenA)));
    }

    function test_setSwapTokenAllowed_emitsEvent() public {
        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit ISherpaRouter.TokenAllowlistUpdated(address(tokenA), true);
        router.setSwapTokenAllowed(address(tokenA), true);
    }

    function test_setSwapTokenAllowed_revertsNonOwner() public {
        vm.prank(nonOwner);
        vm.expectRevert();
        router.setSwapTokenAllowed(address(tokenA), true);
    }

    function test_setSwapTokenAllowed_revertsZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(SherpaRouter.ZeroAddress.selector);
        router.setSwapTokenAllowed(address(0), true);
    }

    function test_batchSetSwapTokenAllowed_setsMultiple() public {
        address[] memory tokens = new address[](2);
        tokens[0] = address(tokenA);
        tokens[1] = address(tokenB);
        bool[] memory allowed = new bool[](2);
        allowed[0] = true;
        allowed[1] = true;

        vm.prank(owner);
        router.batchSetSwapTokenAllowed(tokens, allowed);

        assertTrue(router.swapTokenAllowlist(address(tokenA)));
        assertTrue(router.swapTokenAllowlist(address(tokenB)));
    }

    function test_batchSetSwapTokenAllowed_emitsEvents() public {
        address[] memory tokens = new address[](2);
        tokens[0] = address(tokenA);
        tokens[1] = address(tokenB);
        bool[] memory allowed = new bool[](2);
        allowed[0] = true;
        allowed[1] = false;

        vm.startPrank(owner);
        vm.expectEmit(true, false, false, true);
        emit ISherpaRouter.TokenAllowlistUpdated(address(tokenA), true);
        vm.expectEmit(true, false, false, true);
        emit ISherpaRouter.TokenAllowlistUpdated(address(tokenB), false);
        router.batchSetSwapTokenAllowed(tokens, allowed);
        vm.stopPrank();
    }

    function test_batchSetSwapTokenAllowed_revertsLengthMismatch() public {
        address[] memory tokens = new address[](2);
        tokens[0] = address(tokenA);
        tokens[1] = address(tokenB);
        bool[] memory allowed = new bool[](1);
        allowed[0] = true;

        vm.prank(owner);
        vm.expectRevert(SherpaRouter.LengthMismatch.selector);
        router.batchSetSwapTokenAllowed(tokens, allowed);
    }

    function test_batchSetSwapTokenAllowed_revertsZeroAddress() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(0);
        bool[] memory allowed = new bool[](1);
        allowed[0] = true;

        vm.prank(owner);
        vm.expectRevert(SherpaRouter.ZeroAddress.selector);
        router.batchSetSwapTokenAllowed(tokens, allowed);
    }

    function test_batchSetSwapTokenAllowed_revertsNonOwner() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(tokenA);
        bool[] memory allowed = new bool[](1);
        allowed[0] = true;

        vm.prank(nonOwner);
        vm.expectRevert();
        router.batchSetSwapTokenAllowed(tokens, allowed);
    }

    // ─── getUserPositions Tests ─────────────────────────────────────────

    function test_getUserPositions_returnsMockData() public {
        (
            uint256 totalCollateral,
            uint256 totalDebt,
            uint256 availableBorrows,
            uint256 liquidationThreshold,
            uint256 ltv,
            uint256 healthFactor
        ) = router.getUserPositions(user);

        assertEq(totalCollateral, 1000e8);
        assertEq(totalDebt, 0);
        assertEq(availableBorrows, 500e8);
        assertEq(liquidationThreshold, 8000);
        assertEq(ltv, 7500);
        assertEq(healthFactor, 2e18);
    }

    function test_getUserPositions_reflectsUpdatedMockData() public {
        mockAave.setMockAccountData(5000e8, 1000e8, 3000e8);

        (
            uint256 totalCollateral,
            uint256 totalDebt,
            uint256 availableBorrows,
            ,
            ,
        ) = router.getUserPositions(user);

        assertEq(totalCollateral, 5000e8);
        assertEq(totalDebt, 1000e8);
        assertEq(availableBorrows, 3000e8);
    }

    // ─── Placeholder Function Tests ─────────────────────────────────────

    function test_swap_revertsNotImplemented() public {
        IAerodromeRouter.Route[] memory routes = new IAerodromeRouter.Route[](0);
        vm.prank(user);
        vm.expectRevert("not implemented");
        router.swap(address(tokenA), address(tokenB), 100, 90, routes, block.timestamp);
    }

    function test_supply_revertsNotImplemented() public {
        vm.prank(user);
        vm.expectRevert("not implemented");
        router.supply(address(tokenA), 100);
    }

    function test_withdraw_revertsNotImplemented() public {
        vm.prank(user);
        vm.expectRevert("not implemented");
        router.withdraw(address(tokenA), 100);
    }

    function test_borrow_revertsNotImplemented() public {
        vm.prank(user);
        vm.expectRevert("not implemented");
        router.borrow(address(tokenA), 100, 2);
    }

    function test_repay_revertsNotImplemented() public {
        vm.prank(user);
        vm.expectRevert("not implemented");
        router.repay(address(tokenA), 100, 2);
    }

    // ─── Ownership Tests ────────────────────────────────────────────────

    function test_transferOwnership() public {
        vm.prank(owner);
        router.transferOwnership(nonOwner);
        assertEq(router.owner(), nonOwner);
    }

    function test_renounceOwnership() public {
        vm.prank(owner);
        router.renounceOwnership();
        assertEq(router.owner(), address(0));
    }
}
