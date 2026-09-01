export const palette = {
  teal: {
    50: '#F0FBFA',
    100: '#D3F4F1',
    200: '#A7E8E3',
    300: '#6ED4CE',
    400: '#38BAB5',
    500: '#17A099',
    600: '#0E837E',
    700: '#0D6863',
    800: '#0F524E',
    900: '#103F3D',
  },
  neutral: {
    50: '#F7F9F9',
    100: '#EEF2F2',
    200: '#DDE4E4',
    300: '#C2CCCC',
    400: '#93A1A1',
    500: '#6B7A7A',
    600: '#4E5C5C',
    700: '#3B4747',
    800: '#263030',
    900: '#16201F',
  },
  coral: {
    300: '#FFB3A0',
    400: '#FF8A70',
    500: '#F76A4D',
    600: '#DE4E31',
  },
  green: { 500: '#16A34A', 600: '#15803D' },
  amber: { 500: '#D97706', 600: '#B45309' },
  red: { 400: '#F87171', 500: '#DC2626', 600: '#B91C1C' },
  blue: { 500: '#2563EB', 600: '#1D4ED8' },
} as const

export type ThemeMode = 'light' | 'dark'

export const semanticColor = {
  light: {
    bg: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceSubtle: palette.neutral[50],
    text: palette.neutral[900],
    textMuted: palette.neutral[500],
    border: palette.neutral[200],
    primary: palette.teal[600],
    primaryHover: palette.teal[700],
    primarySubtle: palette.teal[50],
    onPrimary: '#FFFFFF',
    accent: palette.coral[500],
    success: palette.green[500],
    warning: palette.amber[500],
    danger: palette.red[500],
    info: palette.blue[500],
  },
  dark: {
    bg: '#0D1514',
    surface: palette.neutral[900],
    surfaceSubtle: palette.neutral[800],
    text: palette.neutral[50],
    textMuted: palette.neutral[400],
    border: palette.neutral[700],
    primary: palette.teal[400],
    primaryHover: palette.teal[300],
    primarySubtle: palette.teal[900],
    onPrimary: palette.neutral[900],
    accent: palette.coral[400],
    success: palette.green[500],
    warning: palette.amber[500],
    // 어두운 배경에서 red[500]은 surfaceSubtle 대비 2.81:1 — AA 미달이라 red[400]으로 올린다 (4.90:1)
    danger: palette.red[400],
    info: palette.blue[500],
  },
} as const satisfies Record<ThemeMode, Record<string, string>>

export type SemanticColorName = keyof (typeof semanticColor)['light']
