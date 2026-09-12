export function toCents(value: number): number {
  return Math.round(value * 100)
}

export function isValidAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

export function round(cents: number): number {
  return Math.round(cents)
}