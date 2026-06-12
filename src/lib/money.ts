// Money is stored as integer cents end to end (see PRD). Convert only at the
// input/display boundary — never run float arithmetic on stored amounts.

/** Display units (e.g. dollars) → integer cents. Rounds to the nearest cent. */
export function toCents(amount: number): number {
  return Math.round(amount * 100)
}

/** Integer cents → display units. Use only when rendering/seeding an input. */
export function fromCents(cents: number): number {
  return cents / 100
}
