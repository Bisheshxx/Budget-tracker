export const RECURRING_FREQUENCIES = [
  'weekly',
  'fortnightly',
  'monthly',
] as const

export const RECURRING_KINDS = ['expense', 'income'] as const

export const MONTHLY_RULE_TYPES = ['day-of-month', 'nth-weekday'] as const

export const MONTHLY_NTH_VALUES = [1, 2, 3, 4, -1] as const
