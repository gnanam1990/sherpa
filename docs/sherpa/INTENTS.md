# Sherpa Intent Catalog

All 38 intents supported by the Sherpa parser.

## DeFi

### SWAP
**Example:** `swap 100 USDC for ETH`
**Regex:** `/^(?:swap|convert|trade)\s+([\d.]+)\s+(\w+)\s+(?:for|to|→|->)\s+(\w+)(?:\s+with\s+([\d.]+)%\s+slippage)?\s*$/i`
**Params:** `fromAmount`, `fromAsset`, `toAsset`, `slippagePct?`
**On-chain:** Aerodrome Router swap

### LEND
**Example:** `lend 100 USDC`
**Regex:** `/^(?:lend|supply)\s+([\d.]+)\s+(\w+)\s*$/i`
**Params:** `amount`, `asset`
**On-chain:** Aave V3 supply

### BORROW
**Example:** `borrow 100 USDC`
**Regex:** `/^borrow\s+([\d.]+)\s+(\w+)\s*$/i`
**Params:** `borrowAmount`, `borrowAsset`, `interestMode`, `collateralAsset?`, `targetHealthFactor?`
**On-chain:** Aave V3 borrow

### STAKE
**Example:** `stake 1 ETH`
**Regex:** `/^stake\s+([\d.]+)\s+(?:eth|steth)\s*$/i`
**Params:** `stakeAsset`, `stakeAmount`, `receiveAsset?`
**On-chain:** Lido staking

### BRIDGE
**Example:** `bridge 100 USDC to optimism`
**Regex:** `/^bridge\s+([\d.]+)\s+(\w+)\s+to\s+(\w+)\s*$/i`
**Params:** `bridgeAsset`, `bridgeAmount`, `destinationChain`, `sourceChain?`
**On-chain:** Across Protocol

### LP
**Example:** `add 100 USDC and 0.05 ETH liquidity`
**Regex:** `/^(?:provide|add)\s+([\d.]+)\s+(\w+)\s+and\s+([\d.]+)\s+(\w+)\s+(?:liquidity|lp)\s*$/i`
**Params:** `asset1`, `amount1`, `asset2`, `amount2`
**On-chain:** Aerodrome LP

---

## Payments

### SEND
**Example:** `send 5 USDC to 0x1234...`
**Regex:** `/^send\s+([\d.]+)\s*(usdc|eth)?\s+to\s+(\S+)\s*$/i`
**Params:** `amount`, `asset`, `to`
**On-chain:** ERC-20 transfer

### TIP
**Example:** `tip $5 to @username`
**Regex:** `/^tip\s+\$?([\d.]+)\s+(?:to\s+)?@?(\w+)\s*$/i`
**Params:** `tipAmount`, `tipRecipient`, `tipAsset?`
**On-chain:** Farcaster tipping

---

## Information

### BALANCE
**Example:** `balance`
**Regex:** `/^(?:(?:what(?:[’']s|\s+is)\s+my\s+)|(?:show(?:\s+me)?\s+my\s+))?balance\??\s*$/i`
**Params:** none
**On-chain:** Read-only

### HISTORY
**Example:** `last 10 txs`
**Regex:** `/^(?:show\s+)?(?:my\s+)?(?:last\s+(\d+)\s+)?(?:recent\s+)?(?:tx|txs|transactions|history)\s*$/i`
**Params:** `limit` (default 10)
**On-chain:** Read-only

### IDENTITY_LOOKUP
**Example:** `resolve vitalik.eth`
**Regex:** Handled by LLM fallback
**Params:** `identifier`
**On-chain:** Read-only (ENS/Farcaster resolution)

### PORTFOLIO
**Example:** `show my portfolio`
**Regex:** `/^(?:show|display|view|check)\s+(?:my\s+)?portfolio\s*$/i`
**Params:** `portfolioAction`, `portfolioChain?`
**On-chain:** Read-only

### ANALYTICS
**Example:** `show my volume`
**Regex:** `/^(?:show|display|what(?:'s|is))\s+(?:my\s+)?(?:total\s+)?(?:volume|trading\s+volume)\s*$/i`
**Params:** `analyticsAction`
**On-chain:** Read-only

---

## Markets

### BET
**Example:** `bet $5 on ETH above 5000`
**Regex:** `/^bet\s+\$?([\d.]+)\s+(.+?)\s*$/i`
**Params:** `betAmount`, `betAsset`, `betSide`, `marketQuery`
**On-chain:** Limitless/PolyForge market

### COLLECT
**Example:** `collect https://zora.co/...`
**Regex:** `/^(?:collect|mint)\s+(\S+zora\S+)\s*$/i`
**Params:** `collectUrl`, `collectTarget`, `collectAmount`
**On-chain:** Zora NFT mint

---

## Automation

### DCA
**Example:** `dca $100 into ETH daily`
**Regex:** `/^dca\s+\$?([\d.]+)\s+(?:into|of)\s+(\w+)\s+(daily|weekly|monthly)(?:\s+for\s+(\d+)\s+(\w+))?(?:\s+until\s+\$?([\d.]+))?\s*$/i`
**Params:** `dcaAmount`, `dcaAsset`, `frequency`, `duration?`, `untilAmount?`
**On-chain:** Scheduled swap execution

### ALERT
**Example:** `alert me when ETH > $5000`
**Regex:** `/^alert\s+me\s+when\s+(\w+)\s*(>|<|>=|<=|==)\s*\$?([\d.]+)\s*$/i`
**Params:** `conditionType`, `asset`, `comparison`, `threshold`
**On-chain:** None (off-chain monitoring)

### AUTO_REPAY
**Example:** `auto-repay if my health factor < 1.5`
**Regex:** `/^auto-repay\s+(?:if\s+my\s+health\s+factor|when\s+hf)\s*(<|<=)\s*([\d.]+)\s*$/i`
**Params:** `comparison`, `triggerHF`, `maxRepay?`, `repayAsset?`
**On-chain:** Aave V3 repay

### TIME_LOCK
**Example:** `schedule send 100 USDC to 0x1234 in 7 days`
**Regex:** `/^(?:schedule)\s+(?:send|transfer)\s+\$?([\d.]+)\s+(\w+)\s+(?:to\s+)?(\S+)\s+(?:in|at|for)\s+(.+?)\s*$/i`
**Params:** `scheduledAction`, `scheduledAmount`, `scheduledAsset`, `scheduledRecipient`, `scheduledTime`
**On-chain:** Timelock contract

### AUTO_REBALANCE
**Example:** `rebalance my portfolio`
**Regex:** `/^(?:rebalance|auto\s*rebalance)\s+(?:my\s+)?(?:portfolio|holdings|positions)\s*$/i`
**Params:** `rebalanceTarget?`, `rebalancePercent?`
**On-chain:** Multi-swap execution

---

## Social

### POLL
**Example:** `create poll: "Best L2?" with options Base, Arbitrum`
**Regex:** `/^(?:create|make|start)\s+(?:a\s+)?poll\s*[:"]?\s*(.+?)["']?\s*(?:with\s+options?\s+(.+))?\s*$/i`
**Params:** `pollQuestion`, `pollOptions`
**On-chain:** None (Farcaster cast)

### SOCIAL
**Example:** `follow @username`
**Regex:** `/^(?:follow|subscribe\s+to)\s+(?:user\s+)?(\S+)\s*$/i`
**Params:** `socialAction`, `socialTarget`
**On-chain:** None

### GOVERNANCE
**Example:** `vote yes on proposal #1`
**Regex:** `/^(?:vote|cast)\s+(?:my\s+)?(?:vote\s+)?(yes|no|abstain|for|against)\s+(?:on\s+)?(?:proposal\s+)?#?(\d+)?\s*$/i`
**Params:** `govAction`, `govVote?`, `govProposalId?`, `govDelegatee?`
**On-chain:** Governor contract

---

## Advanced

### SESSION_KEY
**Example:** `create session key with limit $100`
**Regex:** `/^(?:create|grant)\s+session\s+key\s+(?:with\s+)?(?:limit|cap)\s+\$?([\d.]+)\s*$/i`
**Params:** `sessionAction`, `sessionLimit?`, `sessionPurpose?`
**On-chain:** ERC-4337 session key

### STRATEGY
**Example:** `create strategy called "DCA ETH"`
**Regex:** `/^(?:create|publish|share)\s+strategy\s+(?:called\s+)?['"]?(.+?)['"]?\s*$/i`
**Params:** `strategyAction`, `strategyName`
**On-chain:** Strategy registry

### COMPOSABLE
**Example:** `flash loan 1000 USDC`
**Regex:** `/^(?:flash\s*loan|borrow\s+flash)\s+([\d.]+)\s+(\w+)\s*$/i`
**Params:** `composableAction`, `composableAmount?`, `composableAsset?`, `composableLeverage?`
**On-chain:** Aave flash loan + composed calls

### RISK
**Example:** `check my risk`
**Regex:** `/^(?:check|assess|analyze)\s+(?:my\s+)?(?:portfolio\s+)?risk\s*$/i`
**Params:** `riskAction`, `riskCondition?`
**On-chain:** Read-only

### AUTOMATION
**Example:** `if ETH > 5000 then swap 100 USDC for ETH`
**Regex:** `/^if\s+(.+?)\s+then\s+(.+?)\s*$/i`
**Params:** `automationAction`, `automationCondition`, `automationAction2`
**On-chain:** Conditional execution

---

## Platform

### SECURITY
**Example:** `enable multisig wallet`
**Regex:** `/^(?:create|setup|enable)\s+multi\s*sig\s*(?:wallet)?\s*$/i`
**Params:** `securityAction`, `securityTarget?`
**On-chain:** Multisig deployment

### DEVELOPER
**Example:** `create api key`
**Regex:** `/^(?:create|generate|get)\s+(?:an?\s+)?api\s+key\s*$/i`
**Params:** `devAction`, `devEvent?`
**On-chain:** None

### AI_AGENT
**Example:** `remember that I prefer conservative trades`
**Regex:** `/^(?:remember|save|note)\s+(?:that\s+)?(.+?)\s*$/i`
**Params:** `aiAction`, `aiMemory?`, `aiGoal?`, `aiTopic?`
**On-chain:** None

### NOTIFICATION
**Example:** `notify me when ETH crosses $5000 via push`
**Regex:** `/^(?:notify|alert|send)\s+me\s+(?:when|if)\s+(.+?)\s*(?:via|through|on)\s+(push|email|farcaster|telegram)\s*$/i`
**Params:** `notificationAction`, `notificationChannel`, `notificationCondition?`
**On-chain:** None
