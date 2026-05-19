/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export function checkCondition(
  currentValue: number,
  comparison: string,
  threshold: number,
  previousValue?: number,
): boolean {
  switch (comparison) {
    case '>':
      return currentValue > threshold;
    case '<':
      return currentValue < threshold;
    case '>=':
      return currentValue >= threshold;
    case '<=':
      return currentValue <= threshold;
    case '==':
      return currentValue === threshold;
    case 'cross-above':
      if (previousValue === undefined) return currentValue > threshold;
      return previousValue <= threshold && currentValue > threshold;
    case 'cross-below':
      if (previousValue === undefined) return currentValue < threshold;
      return previousValue >= threshold && currentValue < threshold;
    default:
      return false;
  }
}
