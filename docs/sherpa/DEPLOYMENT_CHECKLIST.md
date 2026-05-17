# Sherpa Mainnet Deployment Checklist

## Pre-deployment (Complete before flip)

### Security
- [ ] External security audit complete ($5-15k budget)
- [x] All audit findings addressed
- [x] Final reviewer acknowledgement recorded in `docs/sherpa/audit/stage-2/MAINNET_READINESS.md`
- [ ] UserOp signature verification tested
- [ ] Safety rings validated on Sepolia for 14+ days
- [ ] Spend caps configured ($1000/user/day, $100/tx)

### Infrastructure
- [ ] Mainnet Supabase project created
- [ ] Mainnet database migrations applied
- [ ] Mainnet Coinbase Paymaster policy created ($100/day cap)
- [x] Treasury wallet set up (2-of-3 Gnosis Safe)
- [x] Fresh mainnet deployer created; no leaked or previously pasted private key is used
- [ ] Tenderly project for mainnet
- [ ] Sentry project for mainnet

### Configuration
- [ ] All mainnet env vars in password manager
- [ ] SHERPA_CHAIN=base-mainnet set in Railway
- [ ] SHERPA_CHAIN=base-mainnet set in Vercel
- [ ] Paymaster URL matches mainnet
- [ ] Fee treasury address set
- [x] `MAINNET_SAFE_OWNER_ADDRESS` set for contract deployment
- [ ] Admin API key set

### Testing
- [ ] All 500+ tests passing
- [ ] Typecheck clean across all packages
- [ ] Lint clean across all packages
- [ ] Smoke test on Sepolia passed
- [ ] All 38 intents parse correctly

## Deployment Day

### Step 1: Railway API
1. Set SHERPA_CHAIN=base-mainnet in Railway env
2. Set all mainnet env vars
3. Trigger redeploy
4. Watch logs for startup validation
5. Verify: curl https://sherpa-api.up.railway.app/api/health

### Step 2: Vercel Web
1. Set SHERPA_CHAIN=base-mainnet in Vercel env
2. Set SHERPA_API_BASE to Railway URL
3. Trigger redeploy
4. Verify: https://sherpa-web.vercel.app loads

### Step 3: Smoke Test Mainnet
1. Open incognito window
2. Connect Coinbase Smart Wallet
3. Verify: "Base Mainnet" indicator shown
4. Test: "send 0.001 ETH to vitalik.base.eth"
5. Verify: tx on basescan.org, sponsor paid gas
6. Test: "swap 1 USDC for ETH"
7. Verify: tx on basescan.org

### Step 4: Monitor
- Watch Sentry for errors (7 days intensified)
- Watch Railway logs for issues
- Monitor paymaster spend
- Track tx count and volume

## Rollback Plan
If issues found:
1. Set SHERPA_CHAIN=base-sepolia in Railway + Vercel
2. Redeploy both services
3. All traffic returns to Sepolia
4. Investigate and fix before re-attempting
