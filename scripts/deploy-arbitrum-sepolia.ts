/**
 * SherpaRouter + Treasury deployment script for Arbitrum Sepolia.
 *
 * This script is a template. Do NOT execute on mainnet without explicit user approval.
 * Run with: npx ts-node scripts/deploy-arbitrum-sepolia.ts
 *
 * Prerequisites:
 * - DEPLOYER_PRIVATE_KEY env var set
 * - ARBITRUM_SEPOLIA_RPC_URL env var set (default: https://sepolia-rollup.arbitrum.io/rpc)
 * - Deployer wallet funded with Arbitrum Sepolia ETH
 */

import { createPublicClient, createWalletClient, http, parseEther, type Address } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const ARBITRUM_SEPOLIA_RPC = process.env.ARBITRUM_SEPOLIA_RPC_URL ?? 'https://sepolia-rollup.arbitrum.io/rpc';
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;

// Placeholder addresses — replace with real Arbitrum Sepolia addresses
const AERODROME_ROUTER_ARB_SEPOLIA = '0x0000000000000000000000000000000000000000' as Address;
const AAVE_POOL_ARB_SEPOLIA = '0x0000000000000000000000000000000000000000' as Address;

async function main() {
  if (!DEPLOYER_KEY) {
    console.error('DEPLOYER_PRIVATE_KEY not set. This script requires a deployer wallet.');
    console.error('Set the env var and ensure the wallet has Arbitrum Sepolia ETH.');
    process.exit(1);
  }

  const account = privateKeyToAccount(DEPLOYER_KEY as `0x${string}`);

  const publicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(ARBITRUM_SEPOLIA_RPC),
  });

  const walletClient = createWalletClient({
    account,
    chain: arbitrumSepolia,
    transport: http(ARBITRUM_SEPOLIA_RPC),
  });

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Deployer: ${account.address}`);
  console.log(`Balance: ${balance} wei`);

  if (balance === 0n) {
    console.error('Deployer has no ETH. Fund the wallet with Arbitrum Sepolia ETH first.');
    process.exit(1);
  }

  console.log('\n=== Arbitrum Sepolia Deployment ===');
  console.log('WARNING: This is a testnet deployment script.');
  console.log('Do NOT use these addresses on mainnet.\n');

  // Step 1: Deploy SherpaTreasury
  console.log('Step 1: Deploy SherpaTreasury...');
  console.log('  Constructor args: owner =', account.address);
  // TODO: Replace with actual contract bytecode and deployment
  // const treasuryHash = await walletClient.deployContract({
  //   abi: SHERPA_TREASURY_ABI,
  //   bytecode: SHERPA_TREASURY_BYTECODE,
  //   args: [account.address],
  // });
  // const treasuryReceipt = await publicClient.waitForTransactionReceipt({ hash: treasuryHash });
  // console.log(`  Treasury deployed at: ${treasuryReceipt.contractAddress}`);

  // Step 2: Deploy SherpaRouter
  console.log('\nStep 2: Deploy SherpaRouter...');
  console.log('  Constructor args:');
  console.log('    owner =', account.address);
  console.log('    aerodrome =', AERODROME_ROUTER_ARB_SEPOLIA);
  console.log('    aave_pool =', AAVE_POOL_ARB_SEPOLIA);
  console.log('    treasury = <deployed in step 1>');
  // TODO: Replace with actual contract bytecode and deployment
  // const routerHash = await walletClient.deployContract({
  //   abi: SHERPA_ROUTER_ABI,
  //   bytecode: SHERPA_ROUTER_BYTECODE,
  //   args: [account.address, AERODROME_ROUTER_ARB_SEPOLIA, AAVE_POOL_ARB_SEPOLIA, treasuryAddress],
  // });
  // const routerReceipt = await publicClient.waitForTransactionReceipt({ hash: routerHash });
  // console.log(`  Router deployed at: ${routerReceipt.contractAddress}`);

  // Step 3: Configure allowlist
  console.log('\nStep 3: Configure token allowlist...');
  console.log('  Tokens to allowlist: USDC, WETH');
  // TODO: Call router.allowlistToken() for each token

  console.log('\n=== Deployment Complete ===');
  console.log('Save the contract addresses to deployments/arbitrum-sepolia.json');
  console.log('Do NOT commit private keys or sensitive data.');
}

main().catch((err) => {
  console.error('Deployment failed:', err);
  process.exit(1);
});
