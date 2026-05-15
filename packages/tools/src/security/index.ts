export {
  createMultisig,
  getMultisigTransactions,
  buildSubmitCall,
  MULTISIG_ABI,
} from './multisig.js';
export {
  detectHardwareWallets,
  connectLedger,
  connectTrezor,
} from './hardware.js';
export type {
  MultisigConfig,
  MultisigTransaction,
  HardwareWalletInfo,
  SecurityDeps,
} from './types.js';
