// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {SherpaTreasury} from "../src/SherpaTreasury.sol";
import {SherpaRouter} from "../src/SherpaRouter.sol";

/// @title DeploySepolia
/// @notice Deploys Sherpa contracts to Base Sepolia
contract DeploySepolia is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address treasuryAddress = vm.envOr("SHERPA_TREASURY_ADDRESS", address(0));

        vm.startBroadcast(deployerPrivateKey);

        address deployer = vm.addr(deployerPrivateKey);
        console.log("Deploying with account:", deployer);

        SherpaTreasury treasury;
        if (treasuryAddress == address(0)) {
            treasury = new SherpaTreasury(deployer);
            treasuryAddress = address(treasury);
            console.log("SherpaTreasury deployed to:", treasuryAddress);
        } else {
            console.log("Using existing SherpaTreasury:", treasuryAddress);
        }

        // Base Sepolia addresses (update with actual addresses)
        address aerodromeRouter = vm.envOr(
            "AERODROME_ROUTER_ADDRESS",
            address(0x0000000000000000000000000000000000000001)
        );
        address aavePool = vm.envOr(
            "AAVE_POOL_ADDRESS",
            address(0x0000000000000000000000000000000000000002)
        );

        SherpaRouter router = new SherpaRouter(
            deployer,
            aerodromeRouter,
            aavePool,
            treasuryAddress
        );
        console.log("SherpaRouter deployed to:", address(router));

        vm.stopBroadcast();
    }
}
