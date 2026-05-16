// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {MockAerodromeRouter} from "../test/mocks/MockAerodromeRouter.sol";

/// @title DeployMockAerodromeSepolia
/// @notice Deploys a mock Aerodrome router on Base Sepolia when no official testnet router exists.
contract DeployMockAerodromeSepolia is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying MockAerodromeRouter with account:", deployer);
        MockAerodromeRouter router = new MockAerodromeRouter();
        console.log("MockAerodromeRouter deployed to:", address(router));

        vm.stopBroadcast();
    }
}
