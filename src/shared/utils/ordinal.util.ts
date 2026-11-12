// 1 → "1st", 2 → "2nd", 11 → "11th", 22 → "22nd". Shared by the recurring
// schedule description and the Period-start summary.
export function ordinal(n: number): string {
  const suffix =
    n % 100 >= 11 && n % 100 <= 13
      ? 'th'
      : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')
  return `${n}${suffix}`
}
