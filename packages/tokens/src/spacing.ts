export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 9999,
} as const

// 웹 전용 — RN은 elevation/shadow* 스타일을 별도로 구성한다
export const shadow = {
  sm: '0 1px 2px rgb(22 32 31 / 0.06)',
  md: '0 4px 12px rgb(22 32 31 / 0.10)',
  lg: '0 12px 32px rgb(22 32 31 / 0.14)',
} as const
