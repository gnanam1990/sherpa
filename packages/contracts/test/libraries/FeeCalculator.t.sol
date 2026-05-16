// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {FeeCalculator} from "../../src/libraries/FeeCalculator.sol";

contract FeeCalculatorTest is Test {
    function testCalculateFee_zeroFee() public pure {
        uint256 fee = FeeCalculator.calculateFee(1000, 0);
        assertEq(fee, 0);
    }

    function testCalculateFee_10bps() public pure {
        uint256 fee = FeeCalculator.calculateFee(10_000, 10);
        assertEq(fee, 10);
    }

    function testCalculateFee_100bps() public pure {
        uint256 fee = FeeCalculator.calculateFee(10_000, 100);
        assertEq(fee, 100);
    }

    function testCalculateFee_500bps() public pure {
        uint256 fee = FeeCalculator.calculateFee(10_000, 500);
        assertEq(fee, 500);
    }

    function testCalculateFee_10000bps() public pure {
        uint256 fee = FeeCalculator.calculateFee(10_000, 10_000);
        assertEq(fee, 10_000);
    }

    function testCalculateFee_zeroAmount() public pure {
        uint256 fee = FeeCalculator.calculateFee(0, 100);
        assertEq(fee, 0);
    }

    function testCalculateFee_largeAmount() public pure {
        uint256 fee = FeeCalculator.calculateFee(1e30, 10);
        assertEq(fee, 1e27);
    }

    function testAfterFee_zeroFee() public pure {
        uint256 net = FeeCalculator.afterFee(10_000, 0);
        assertEq(net, 10_000);
    }

    function testAfterFee_10bps() public pure {
        uint256 net = FeeCalculator.afterFee(10_000, 10);
        assertEq(net, 9_990);
    }

    function testAfterFee_100bps() public pure {
        uint256 net = FeeCalculator.afterFee(10_000, 100);
        assertEq(net, 9_900);
    }

    function testAfterFee_500bps() public pure {
        uint256 net = FeeCalculator.afterFee(10_000, 500);
        assertEq(net, 9_500);
    }

    function testAfterFee_10000bps() public pure {
        uint256 net = FeeCalculator.afterFee(10_000, 10_000);
        assertEq(net, 0);
    }

    function testAfterFee_zeroAmount() public pure {
        uint256 net = FeeCalculator.afterFee(0, 100);
        assertEq(net, 0);
    }

    function testAfterFee_plusCalculateFee_equalsOriginal() public pure {
        uint256 amount = 12345;
        uint256 bps = 10;
        uint256 fee = FeeCalculator.calculateFee(amount, bps);
        uint256 net = FeeCalculator.afterFee(amount, bps);
        assertEq(fee + net, amount);
    }

    function testFuzz_calculateFee(uint256 amount, uint256 feeBps) public pure {
        vm.assume(feeBps > 0 && feeBps <= 10_000);
        vm.assume(amount <= type(uint256).max / feeBps);
        uint256 fee = FeeCalculator.calculateFee(amount, feeBps);
        assertEq(fee, (amount * feeBps) / 10_000);
    }

    function testFuzz_afterFee_plusFee_equalsOriginal(uint256 amount, uint256 feeBps) public pure {
        vm.assume(feeBps > 0 && feeBps <= 10_000);
        vm.assume(amount <= type(uint256).max / feeBps);
        uint256 fee = FeeCalculator.calculateFee(amount, feeBps);
        uint256 net = FeeCalculator.afterFee(amount, feeBps);
        assertEq(fee + net, amount);
    }
}
