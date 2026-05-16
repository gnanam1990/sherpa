/**
 * Parser extensions for cross-chain intent detection (Stage 8).
 */

export {
  detectChain,
  detectAllChains,
  parseBridgeIntent,
  hasChainMention,
  extractChainFromIntent,
} from './cross-chain.js';
export type { DetectedChain, CrossChainIntent } from './cross-chain.js';
