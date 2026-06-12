// Money is stored as integer cents end to end (see PRD). Convert only at the
// input/display boundary — never run float arithmetic on stored amounts.

/** Display units (e.g. dollars) → integer cents. Rounds to the nearest cent. */
export function toCents(amount: number): number {
  // Scaling can introduce binary float error (1.005 * 100 === 100.49999…),
  // which would round 1.005 down to 100 instead of 101. Pin the scaled value
  // to 2 decimals first to strip that noise before rounding to whole cents.
  return Math.round(Number((amount * 100).toFixed(2)))
}

/** Integer cents → display units. Use only when rendering/seeding an input. */
export function fromCents(cents: number): number {
  return cents / 100
}
