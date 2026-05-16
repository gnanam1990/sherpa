// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SafetyCheck} from "../../src/libraries/SafetyCheck.sol";
import {SafetyCheckWrapper} from "../mocks/SafetyCheckWrapper.sol";

contract SafetyCheckTest is Test {
    SafetyCheckWrapper public wrapper;

    function setUp() public {
        wrapper = new SafetyCheckWrapper();
    }

    function testValidateSlippage_withinRange() public {
        wrapper.validateSlippage(100, 10, 500);
    }

    function testValidateSlippage_atMin() public {
        wrapper.validateSlippage(10, 10, 500);
    }

    function testValidateSlippage_atMax() public {
        wrapper.validateSlippage(500, 10, 500);
    }

    function testValidateSlippage_belowMin() public {
        vm.expectRevert(
            abi.encodeWithSelector(SafetyCheck.InvalidSlippage.selector, 5, 10, 500)
        );
        wrapper.validateSlippage(5, 10, 500);
    }

    function testValidateSlippage_aboveMax() public {
        vm.expectRevert(
            abi.encodeWithSelector(SafetyCheck.InvalidSlippage.selector, 501, 10, 500)
        );
        wrapper.validateSlippage(501, 10, 500);
    }

    function testValidateDeadline_futureTimestamp() public {
        vm.warp(1000);
        wrapper.validateDeadline(2000);
    }

    function testValidateDeadline_exactTimestamp() public {
        vm.warp(1000);
        wrapper.validateDeadline(1000);
    }

    function testValidateDeadline_expiredTimestamp() public {
        vm.warp(2000);
        vm.expectRevert(
            abi.encodeWithSelector(SafetyCheck.DeadlineExpired.selector, 1000, 2000)
        );
        wrapper.validateDeadline(1000);
    }

    function testFuzz_validateSlippage_alwaysRevertsOutsideRange(
        uint256 slippage,
        uint256 min,
        uint256 max
    ) public {
        vm.assume(min < max);
        vm.assume(slippage < min || slippage > max);
        vm.expectRevert();
        wrapper.validateSlippage(slippage, min, max);
    }

    function testFuzz_validateDeadline_alwaysRevertsWhenExpired(uint256 deadline) public {
        vm.assume(deadline < block.timestamp);
        vm.expectRevert();
        wrapper.validateDeadline(deadline);
    }
}
