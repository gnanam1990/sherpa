/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

/**
 * LayerZero cross-chain messaging adapter (Stage 8).
 *
 * Re-exports for use with '@sherpa/tools'.
 */

export { getLayerZeroQuote, buildLayerZeroCall, LayerZeroNotSupportedError } from './bridge.js';
export type { LayerZeroParams, LayerZeroQuote } from './types.js';
export { LZ_ENDPOINT_IDS, LZ_ENDPOINTS, isLayerZeroSupported } from './types.js';
