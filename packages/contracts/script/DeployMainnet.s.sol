// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {SherpaTreasury} from "../src/SherpaTreasury.sol";
import {SherpaRouter} from "../src/SherpaRouter.sol";

/// @title DeployMainnet
/// @notice Guarded Base mainnet deployment script for the audited Stage 2 contracts.
/// @dev This script intentionally requires mainnet-specific env vars so testnet
///      addresses cannot be reused accidentally. Dry-run before broadcasting.
contract DeployMainnet is Script {
    uint256 internal constant BASE_MAINNET_CHAIN_ID = 8453;
    uint256 internal constant DEFAULT_MIN_DEPLOYER_BALANCE = 0.01 ether;

    address internal constant EXPECTED_AERODROME_ROUTER = 0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43;
    address internal constant EXPECTED_AAVE_POOL = 0xA238Dd80C259a72e81d7e4664a9801593F98d1c5;

    address internal constant BASE_USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address internal constant BASE_WETH = 0x4200000000000000000000000000000000000006;
    address internal constant BASE_DAI = 0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb;

    function run() external {
        require(block.chainid == BASE_MAINNET_CHAIN_ID, "Base mainnet only");

        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address safeOwner = vm.envAddress("MAINNET_SAFE_OWNER_ADDRESS");
        address aerodromeRouter = vm.envAddress("MAINNET_AERODROME_ROUTER_ADDRESS");
        address aavePool = vm.envAddress("MAINNET_AAVE_POOL_ADDRESS");
        uint256 minDeployerBalance = vm.envOr("MAINNET_MIN_DEPLOYER_BALANCE_WEI", DEFAULT_MIN_DEPLOYER_BALANCE);

        require(safeOwner != address(0), "MAINNET_SAFE_OWNER_ADDRESS required");
        require(safeOwner != deployer, "safe owner must differ from deployer");
        require(safeOwner.code.length > 0, "safe owner must be deployed");
        require(deployer.balance >= minDeployerBalance, "deployer underfunded");

        require(aerodromeRouter == EXPECTED_AERODROME_ROUTER, "unexpected Aerodrome router");
        require(aavePool == EXPECTED_AAVE_POOL, "unexpected Aave pool");
        require(aerodromeRouter.code.length > 0, "Aerodrome router has no code");
        require(aavePool.code.length > 0, "Aave pool has no code");
        require(BASE_USDC.code.length > 0, "USDC has no code");
        require(BASE_WETH.code.length > 0, "WETH has no code");
        require(BASE_DAI.code.length > 0, "DAI has no code");

        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying Stage 2 contracts to Base mainnet");
        console.log("Deployer:", deployer);
        console.log("Final Safe owner:", safeOwner);

        SherpaTreasury treasury = new SherpaTreasury(deployer);
        console.log("SherpaTreasury deployed to:", address(treasury));

        SherpaRouter router = new SherpaRouter(deployer, aerodromeRouter, aavePool, address(treasury));
        console.log("SherpaRouter deployed to:", address(router));

        address[] memory tokens = new address[](3);
        tokens[0] = BASE_USDC;
        tokens[1] = BASE_WETH;
        tokens[2] = BASE_DAI;

        bool[] memory allowed = new bool[](3);
        allowed[0] = true;
        allowed[1] = true;
        allowed[2] = true;

        router.batchSetSwapTokenAllowed(tokens, allowed);
        console.log("Initial allowlist configured: USDC, WETH, DAI");

        router.transferOwnership(safeOwner);
        treasury.transferOwnership(safeOwner);
        console.log("Ownership transferred to Safe:", safeOwner);

        vm.stopBroadcast();
    }
}
