// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {SherpaRouter} from "../src/SherpaRouter.sol";
import {IAerodromeRouter} from "../src/interfaces/IAerodromeRouter.sol";
import {ISherpaRouter} from "../src/interfaces/ISherpaRouter.sol";
import {SafetyCheck} from "../src/libraries/SafetyCheck.sol";
import {MockAerodromeRouter} from "./mocks/MockAerodromeRouter.sol";
import {MockAavePool} from "./mocks/MockAavePool.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract SherpaRouterTest is Test {
    bytes32 public constant TEST_BUILDER_CODE = "bc_97ju6eu2";

    SherpaRouter public router;
    MockAerodromeRouter public mockAerodrome;
    MockAavePool public mockAave;
    MockERC20 public tokenA;
    MockERC20 public tokenB;
    MockERC20 public aTokenA;

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
        aTokenA = new MockERC20("aToken A", "aTKA", 18);

        router = new SherpaRouter(owner, address(mockAerodrome), address(mockAave), treasury);

        // Allow both tokens
        router.setSwapTokenAllowed(address(tokenA), true);
        router.setSwapTokenAllowed(address(tokenB), true);
        vm.stopPrank();

        // Wire aToken for tokenA in the mock pool
        mockAave.setReserveAToken(address(tokenA), address(aTokenA));

        // Pre-fund Aerodrome mock with tokenB so it can transfer on swaps
        tokenB.mint(address(mockAerodrome), 1_000_000e18);
        // Pre-fund Aave mock so borrow() mirrors real Aave by sending assets to the router caller.
        tokenA.mint(address(mockAave), 1_000_000e18);
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
        assertEq(router.MIN_HEALTH_FACTOR(), 1.5e18);
        assertEq(router.MIN_WITHDRAW_HEALTH_FACTOR(), 1.5e18);
        assertEq(router.BUILDER_CODE(), TEST_BUILDER_CODE);
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

    function test_batchSetSwapTokenAllowed_emitsBatchCompletionEvent() public {
        address[] memory tokens = new address[](2);
        tokens[0] = address(tokenA);
        tokens[1] = address(tokenB);
        bool[] memory allowed = new bool[](2);
        allowed[0] = true;
        allowed[1] = false;

        vm.startPrank(owner);
        vm.expectEmit(false, false, false, true);
        emit ISherpaRouter.BatchTokenAllowlistUpdated(2);
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

    function test_getUserPositions_returnsMockData() public view {
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

        (uint256 totalCollateral, uint256 totalDebt, uint256 availableBorrows,,,) = router.getUserPositions(user);

        assertEq(totalCollateral, 5000e8);
        assertEq(totalDebt, 1000e8);
        assertEq(availableBorrows, 3000e8);
    }

    // ─── Swap Tests ─────────────────────────────────────────────────────

    function _swapRoutes() internal view returns (IAerodromeRouter.Route[] memory routes) {
        routes = new IAerodromeRouter.Route[](1);
        routes[0] =
            IAerodromeRouter.Route({from: address(tokenA), to: address(tokenB), stable: false, factory: address(0)});
    }

    function _mismatchedFromRoutes() internal view returns (IAerodromeRouter.Route[] memory routes) {
        routes = new IAerodromeRouter.Route[](1);
        routes[0] =
            IAerodromeRouter.Route({from: address(tokenB), to: address(tokenA), stable: false, factory: address(0)});
    }

    function _multiHopRoutes() internal view returns (IAerodromeRouter.Route[] memory routes) {
        routes = new IAerodromeRouter.Route[](2);
        routes[0] =
            IAerodromeRouter.Route({from: address(tokenA), to: address(tokenB), stable: false, factory: address(0)});
        routes[1] =
            IAerodromeRouter.Route({from: address(tokenB), to: address(tokenA), stable: false, factory: address(0)});
    }

    function _amountAfterFee(uint256 amountIn) internal pure returns (uint256) {
        return amountIn - ((amountIn * 10) / 10_000);
    }

    function _minOutForSlippage(uint256 amountIn, uint256 slippageBps) internal pure returns (uint256) {
        uint256 quotedOut = _amountAfterFee(amountIn);
        return (quotedOut * (10_000 - slippageBps)) / 10_000;
    }

    function test_swap_happyPath() public {
        uint256 amountIn = 1000e18;
        uint256 amountOutMin = _minOutForSlippage(amountIn, 50);
        tokenA.mint(user, amountIn);

        vm.startPrank(user);
        tokenA.approve(address(router), amountIn);
        uint256 amountOut =
            router.swap(address(tokenA), address(tokenB), amountIn, amountOutMin, _swapRoutes(), block.timestamp + 100);
        vm.stopPrank();

        uint256 expectedFee = (amountIn * 10) / 10_000;
        assertGt(amountOut, 0);
        assertEq(tokenA.balanceOf(treasury), expectedFee);
        assertEq(tokenB.balanceOf(user), amountOut);
    }

    function test_swap_feeGoesToTreasury() public {
        uint256 amountIn = 10_000e18;
        uint256 amountOutMin = _minOutForSlippage(amountIn, 50);
        tokenA.mint(user, amountIn);

        vm.startPrank(user);
        tokenA.approve(address(router), amountIn);
        router.swap(address(tokenA), address(tokenB), amountIn, amountOutMin, _swapRoutes(), block.timestamp + 100);
        vm.stopPrank();

        uint256 expectedFee = (amountIn * 10) / 10_000;
        assertEq(tokenA.balanceOf(treasury), expectedFee);
    }

    function test_swap_emitsSwapExecuted() public {
        uint256 amountIn = 1000e18;
        uint256 amountOutMin = _minOutForSlippage(amountIn, 50);
        tokenA.mint(user, amountIn);

        vm.startPrank(user);
        tokenA.approve(address(router), amountIn);
        vm.expectEmit(true, true, true, false);
        emit ISherpaRouter.SwapExecuted(user, address(tokenA), address(tokenB), amountIn, 0, 0, TEST_BUILDER_CODE);
        router.swap(address(tokenA), address(tokenB), amountIn, amountOutMin, _swapRoutes(), block.timestamp + 100);
        vm.stopPrank();
    }

    function test_swap_revertsZeroAmount() public {
        vm.prank(user);
        vm.expectRevert(SherpaRouter.ZeroAmount.selector);
        router.swap(address(tokenA), address(tokenB), 0, 0, _swapRoutes(), block.timestamp + 100);
    }

    function test_swap_revertsTokenInNotAllowed() public {
        MockERC20 unknownToken = new MockERC20("Unknown", "UNK", 18);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(SherpaRouter.TokenNotAllowed.selector, address(unknownToken)));
        router.swap(address(unknownToken), address(tokenB), 100, 0, _swapRoutes(), block.timestamp + 100);
    }

    function test_swap_revertsTokenOutNotAllowed() public {
        MockERC20 unknownToken = new MockERC20("Unknown", "UNK", 18);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(SherpaRouter.TokenNotAllowed.selector, address(unknownToken)));
        router.swap(address(tokenA), address(unknownToken), 100, 0, _swapRoutes(), block.timestamp + 100);
    }

    function test_swap_revertsMismatchedRouteEndpoints() public {
        uint256 amountIn = 1000e18;
        tokenA.mint(user, amountIn);

        vm.startPrank(user);
        tokenA.approve(address(router), amountIn);
        vm.expectRevert(SherpaRouter.InvalidRoute.selector);
        router.swap(
            address(tokenA),
            address(tokenB),
            amountIn,
            _minOutForSlippage(amountIn, 50),
            _mismatchedFromRoutes(),
            block.timestamp + 100
        );
        vm.stopPrank();
    }

    function test_swap_revertsMultiHopRoutes() public {
        uint256 amountIn = 1000e18;
        tokenA.mint(user, amountIn);

        vm.startPrank(user);
        tokenA.approve(address(router), amountIn);
        vm.expectRevert(SherpaRouter.InvalidRoute.selector);
        router.swap(
            address(tokenA),
            address(tokenB),
            amountIn,
            _minOutForSlippage(amountIn, 50),
            _multiHopRoutes(),
            block.timestamp + 100
        );
        vm.stopPrank();
    }

    function test_swap_revertsExpiredDeadline() public {
        uint256 amountIn = 1000e18;
        tokenA.mint(user, amountIn);
        vm.startPrank(user);
        tokenA.approve(address(router), amountIn);
        vm.expectRevert(
            abi.encodeWithSelector(SafetyCheck.DeadlineExpired.selector, block.timestamp - 1, block.timestamp)
        );
        router.swap(address(tokenA), address(tokenB), amountIn, 0, _swapRoutes(), block.timestamp - 1);
        vm.stopPrank();
    }

    function test_swap_revertsExcessiveSlippage() public {
        uint256 amountIn = 1000e18;
        tokenA.mint(user, amountIn);

        vm.startPrank(user);
        tokenA.approve(address(router), amountIn);
        vm.expectRevert(abi.encodeWithSelector(SafetyCheck.InvalidSlippage.selector, 10_000, 10, 500));
        router.swap(address(tokenA), address(tokenB), amountIn, 0, _swapRoutes(), block.timestamp + 100);
        vm.stopPrank();
    }

    function test_swap_revertsSlippageBelowMinimum() public {
        uint256 amountIn = 1000e18;
        uint256 quotedOut = _amountAfterFee(amountIn);
        uint256 amountOutMin = (quotedOut * 9995) / 10_000;
        tokenA.mint(user, amountIn);

        vm.startPrank(user);
        tokenA.approve(address(router), amountIn);
        vm.expectRevert(abi.encodeWithSelector(SafetyCheck.InvalidSlippage.selector, 5, 10, 500));
        router.swap(address(tokenA), address(tokenB), amountIn, amountOutMin, _swapRoutes(), block.timestamp + 100);
        vm.stopPrank();
    }

    function test_swap_allowsStrictAmountOutMin() public {
        uint256 amountIn = 1000e18;
        uint256 amountOutMin = _amountAfterFee(amountIn);
        tokenA.mint(user, amountIn);

        vm.startPrank(user);
        tokenA.approve(address(router), amountIn);
        uint256 amountOut =
            router.swap(address(tokenA), address(tokenB), amountIn, amountOutMin, _swapRoutes(), block.timestamp + 100);
        vm.stopPrank();

        assertEq(amountOut, amountOutMin);
    }

    // ─── Supply Tests ───────────────────────────────────────────────────

    function test_supply_happyPath() public {
        uint256 amount = 500e18;
        tokenA.mint(user, amount);

        vm.startPrank(user);
        tokenA.approve(address(router), amount);
        router.supply(address(tokenA), amount);
        vm.stopPrank();

        assertEq(mockAave.supplied(address(tokenA)), amount);
    }

    function test_supply_emitsSupplyExecuted() public {
        uint256 amount = 500e18;
        tokenA.mint(user, amount);

        vm.startPrank(user);
        tokenA.approve(address(router), amount);
        vm.expectEmit(true, true, false, true);
        emit ISherpaRouter.SupplyExecuted(user, address(tokenA), amount, TEST_BUILDER_CODE);
        router.supply(address(tokenA), amount);
        vm.stopPrank();
    }

    function test_supply_revertsZeroAmount() public {
        vm.prank(user);
        vm.expectRevert(SherpaRouter.ZeroAmount.selector);
        router.supply(address(tokenA), 0);
    }

    function test_supply_revertsTokenNotAllowed() public {
        MockERC20 unknownToken = new MockERC20("Unknown", "UNK", 18);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(SherpaRouter.TokenNotAllowed.selector, address(unknownToken)));
        router.supply(address(unknownToken), 100);
    }

    // ─── Withdraw Tests ─────────────────────────────────────────────────

    function test_withdraw_happyPath_noDebt() public {
        uint256 amount = 200e18;
        // User holds aTokens (representing their Aave position)
        aTokenA.mint(user, amount);
        mockAave.supply(address(tokenA), amount, user, 0);
        // Mock: supply so the pool has the asset to return
        mockAave.setMockAccountData(1000e8, 0, 500e8); // no debt
        mockAave.setMockHealthFactor(2e18);

        vm.startPrank(user);
        aTokenA.approve(address(router), amount);
        router.withdraw(address(tokenA), amount);
        vm.stopPrank();
    }

    function test_withdraw_happyPath_withDebt_hfOk() public {
        uint256 amount = 100e18;
        aTokenA.mint(user, amount);
        mockAave.supply(address(tokenA), amount, user, 0);
        // Has debt but HF is safely above 1.5
        mockAave.setMockAccountData(1000e8, 200e8, 300e8);
        mockAave.setMockHealthFactor(2e18);

        vm.startPrank(user);
        aTokenA.approve(address(router), amount);
        router.withdraw(address(tokenA), amount);
        vm.stopPrank();
    }

    function test_withdraw_revertsUnhealthyPosition() public {
        uint256 amount = 100e18;
        aTokenA.mint(user, amount);
        mockAave.supply(address(tokenA), amount, user, 0);
        // Has debt and HF drops below 1.5 after withdraw
        mockAave.setMockAccountData(500e8, 200e8, 100e8);
        mockAave.setMockHealthFactor(1.3e18); // below 1.5

        vm.startPrank(user);
        aTokenA.approve(address(router), amount);
        vm.expectRevert(abi.encodeWithSelector(SherpaRouter.UnhealthyPosition.selector, 1.3e18));
        router.withdraw(address(tokenA), amount);
        vm.stopPrank();
    }

    function test_withdraw_revertsZeroAmount() public {
        vm.prank(user);
        vm.expectRevert(SherpaRouter.ZeroAmount.selector);
        router.withdraw(address(tokenA), 0);
    }

    function test_withdraw_revertsTokenNotAllowed() public {
        MockERC20 unknownToken = new MockERC20("Unknown", "UNK", 18);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(SherpaRouter.TokenNotAllowed.selector, address(unknownToken)));
        router.withdraw(address(unknownToken), 100);
    }

    function test_withdraw_revertsWhenReserveDataHasNoAToken() public {
        MockERC20 allowedWithoutAToken = new MockERC20("Allowed Without aToken", "AWA", 18);
        vm.prank(owner);
        router.setSwapTokenAllowed(address(allowedWithoutAToken), true);
        allowedWithoutAToken.mint(user, 100e18);

        vm.startPrank(user);
        allowedWithoutAToken.approve(address(router), 100e18);
        vm.expectRevert(
            abi.encodeWithSelector(SherpaRouter.ReserveDataUnavailable.selector, address(allowedWithoutAToken))
        );
        router.withdraw(address(allowedWithoutAToken), 100e18);
        vm.stopPrank();
    }

    function test_withdraw_emitsWithdrawExecuted() public {
        uint256 amount = 200e18;
        aTokenA.mint(user, amount);
        mockAave.supply(address(tokenA), amount, user, 0);
        mockAave.setMockAccountData(1000e8, 0, 500e8);
        mockAave.setMockHealthFactor(2e18);

        vm.startPrank(user);
        aTokenA.approve(address(router), amount);
        vm.expectEmit(true, true, false, true);
        emit ISherpaRouter.WithdrawExecuted(user, address(tokenA), amount, TEST_BUILDER_CODE);
        router.withdraw(address(tokenA), amount);
        vm.stopPrank();
    }

    function test_withdraw_emitsActualWithdrawnAmountAndRefundsUnusedAToken() public {
        uint256 requestedAmount = 200e18;
        uint256 actualAmount = 125e18;
        aTokenA.mint(user, requestedAmount);
        mockAave.supply(address(tokenA), actualAmount, user, 0);
        mockAave.setMockAccountData(1000e8, 0, 500e8);
        mockAave.setMockHealthFactor(2e18);

        vm.startPrank(user);
        aTokenA.approve(address(router), requestedAmount);
        vm.expectEmit(true, true, false, true);
        emit ISherpaRouter.WithdrawExecuted(user, address(tokenA), actualAmount, TEST_BUILDER_CODE);
        router.withdraw(address(tokenA), requestedAmount);
        vm.stopPrank();

        assertEq(aTokenA.balanceOf(user), requestedAmount - actualAmount);
    }

    // ─── Borrow Tests ───────────────────────────────────────────────────

    function test_borrow_happyPath_variable() public {
        // HF stays at the safer 1.5 minimum after borrow
        mockAave.setMockHealthFactor(1.5e18);

        vm.prank(user);
        router.borrow(address(tokenA), 100e18, 2);

        assertEq(mockAave.borrowed(address(tokenA)), 100e18);
        assertEq(tokenA.balanceOf(user), 100e18);
    }

    function test_borrow_happyPath_stable() public {
        mockAave.setMockHealthFactor(1.6e18);

        vm.prank(user);
        router.borrow(address(tokenA), 50e18, 1);

        assertEq(mockAave.borrowed(address(tokenA)), 50e18);
        assertEq(tokenA.balanceOf(user), 50e18);
    }

    function test_borrow_revertsUnhealthyPosition() public {
        // HF drops below 1.5 after borrow
        mockAave.setMockHealthFactor(1.4e18);

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(SherpaRouter.UnhealthyPosition.selector, 1.4e18));
        router.borrow(address(tokenA), 100e18, 2);
    }

    function test_borrow_revertsZeroAmount() public {
        vm.prank(user);
        vm.expectRevert(SherpaRouter.ZeroAmount.selector);
        router.borrow(address(tokenA), 0, 2);
    }

    function test_borrow_revertsTokenNotAllowed() public {
        MockERC20 unknownToken = new MockERC20("Unknown", "UNK", 18);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(SherpaRouter.TokenNotAllowed.selector, address(unknownToken)));
        router.borrow(address(unknownToken), 100, 2);
    }

    function test_borrow_revertsInvalidRateMode_zero() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(SherpaRouter.InvalidInterestRateMode.selector, 0));
        router.borrow(address(tokenA), 100, 0);
    }

    function test_borrow_revertsInvalidRateMode_three() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(SherpaRouter.InvalidInterestRateMode.selector, 3));
        router.borrow(address(tokenA), 100, 3);
    }

    function test_borrow_emitsBorrowExecuted() public {
        mockAave.setMockHealthFactor(1.6e18);

        vm.prank(user);
        vm.expectEmit(true, true, false, true);
        emit ISherpaRouter.BorrowExecuted(user, address(tokenA), 100e18, 2, TEST_BUILDER_CODE);
        router.borrow(address(tokenA), 100e18, 2);
    }

    // ─── Repay Tests ────────────────────────────────────────────────────

    function test_repay_happyPath_variable() public {
        uint256 amount = 100e18;
        tokenA.mint(user, amount);

        vm.startPrank(user);
        tokenA.approve(address(router), amount);
        router.repay(address(tokenA), amount, 2);
        vm.stopPrank();
    }

    function test_repay_happyPath_stable() public {
        uint256 amount = 50e18;
        tokenA.mint(user, amount);

        vm.startPrank(user);
        tokenA.approve(address(router), amount);
        router.repay(address(tokenA), amount, 1);
        vm.stopPrank();
    }

    function test_repay_revertsZeroAmount() public {
        vm.prank(user);
        vm.expectRevert(SherpaRouter.ZeroAmount.selector);
        router.repay(address(tokenA), 0, 2);
    }

    function test_repay_revertsTokenNotAllowed() public {
        MockERC20 unknownToken = new MockERC20("Unknown", "UNK", 18);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(SherpaRouter.TokenNotAllowed.selector, address(unknownToken)));
        router.repay(address(unknownToken), 100, 2);
    }

    function test_repay_revertsInvalidRateMode() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(SherpaRouter.InvalidInterestRateMode.selector, 0));
        router.repay(address(tokenA), 100, 0);
    }

    function test_repay_emitsRepayExecuted() public {
        uint256 amount = 100e18;
        tokenA.mint(user, amount);
        // Pre-set borrowed state so the mock returns the full amount
        mockAave.setBorrowed(address(tokenA), amount);

        vm.startPrank(user);
        tokenA.approve(address(router), amount);
        vm.expectEmit(true, true, false, true);
        emit ISherpaRouter.RepayExecuted(user, address(tokenA), amount, 2, TEST_BUILDER_CODE);
        router.repay(address(tokenA), amount, 2);
        vm.stopPrank();
    }

    function test_repay_refundsExcessWhenDebtIsLowerThanRequestedAmount() public {
        uint256 requestedAmount = 100e18;
        uint256 actualDebt = 40e18;
        tokenA.mint(user, requestedAmount);
        mockAave.setBorrowed(address(tokenA), actualDebt);

        vm.startPrank(user);
        tokenA.approve(address(router), requestedAmount);
        vm.expectEmit(true, true, false, true);
        emit ISherpaRouter.RepayExecuted(user, address(tokenA), actualDebt, 2, TEST_BUILDER_CODE);
        router.repay(address(tokenA), requestedAmount, 2);
        vm.stopPrank();

        assertEq(tokenA.balanceOf(user), requestedAmount - actualDebt);
    }

    // ─── Pause Tests ───────────────────────────────────────────────────────

    function test_pauseAndUnpause_ownerOnly() public {
        assertFalse(router.paused());

        vm.prank(owner);
        router.pause();
        assertTrue(router.paused());

        vm.prank(owner);
        router.unpause();
        assertFalse(router.paused());
    }

    function test_pause_revertsNonOwner() public {
        vm.prank(nonOwner);
        vm.expectRevert();
        router.pause();
    }

    function test_swap_revertsWhenPaused() public {
        uint256 amountIn = 1000e18;
        tokenA.mint(user, amountIn);

        vm.prank(owner);
        router.pause();

        vm.startPrank(user);
        tokenA.approve(address(router), amountIn);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        router.swap(
            address(tokenA),
            address(tokenB),
            amountIn,
            _minOutForSlippage(amountIn, 50),
            _swapRoutes(),
            block.timestamp + 100
        );
        vm.stopPrank();
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
