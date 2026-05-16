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
