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
    // 다크 primarySubtle 전용. teal[900] 위의 textMuted가 4.36:1(AA 미달)이라 한 단
    // 더 어두운 틴트를 추가했다 (5.19:1). teal[900]은 CaptionStage 무대 배경이 쓰므로 그대로 둔다.
    950: '#0C3230',
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
    // 라이트 accent 전용. coral[500]은 흰 배경에서 2.95:1, coral[600]도 4.01:1로
    // 본문 텍스트 AA에 못 미친다 (5.02:1).
    700: '#C4432A',
  },
  green: { 400: '#22C55E', 500: '#16A34A', 600: '#15803D' },
  amber: { 400: '#F59E0B', 500: '#D97706', 600: '#B45309' },
  red: { 400: '#F87171', 500: '#DC2626', 600: '#B91C1C' },
  blue: { 400: '#60A5FA', 500: '#2563EB', 600: '#1D4ED8' },
} as const

export type ThemeMode = 'light' | 'dark'

/**
 * 시맨틱 색. 값은 전부 `contrast.ts`의 조합 목록으로 검증된다
 * (`__tests__/contrast.test.ts` — 일반 텍스트 4.5:1, 비텍스트 3:1).
 * 값을 바꾸면 테스트가 먼저 깨진다. 수치는 그 테스트가 정본이다.
 */
export const semanticColor = {
  light: {
    bg: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceSubtle: palette.neutral[50],
    text: palette.neutral[900],
    // neutral[500]은 흰 배경 4.48:1 · surfaceSubtle 4.24:1로 AA 미달이었다 → neutral[600] (6.98 / 6.60)
    textMuted: palette.neutral[600],
    border: palette.neutral[200],
    // 컨트롤(입력·칩) 테두리 전용. border는 장식용 hairline이라 1.29:1이고,
    // WCAG 1.4.11(비텍스트 3:1)은 컨트롤 경계에는 적용된다 → 4.48:1
    borderStrong: palette.neutral[500],
    // teal[600]은 surfaceSubtle/primarySubtle 위에서 4.35:1로 AA 미달이었다 → teal[700] (6.25 / 6.26)
    primary: palette.teal[700],
    primaryHover: palette.teal[800],
    primarySubtle: palette.teal[50],
    onPrimary: '#FFFFFF',
    accent: palette.coral[700],
    // green[500] 3.30:1 / amber[500] 3.19:1 — 상태 텍스트로 쓰이므로 한 단 어둡게
    success: palette.green[600],
    warning: palette.amber[600],
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
    // 다크에서도 컨트롤 경계는 3:1이 필요하다. border(neutral[700])는 1.92:1 → neutral[500] (3.03~4.13:1)
    borderStrong: palette.neutral[500],
    primary: palette.teal[400],
    primaryHover: palette.teal[300],
    primarySubtle: palette.teal[950],
    onPrimary: palette.neutral[900],
    accent: palette.coral[400],
    // 어두운 배경에서 500단은 surfaceSubtle 대비가 4.5:1에 못 미친다
    // (success 4.12 / warning 4.26 / info 2.62) → 400단으로 올린다
    success: palette.green[400],
    warning: palette.amber[400],
    // 어두운 배경에서 red[500]은 surfaceSubtle 대비 2.81:1 — AA 미달이라 red[400]을 팔레트에 추가해 교체했다 (4.90:1)
    danger: palette.red[400],
    info: palette.blue[400],
  },
} as const satisfies Record<ThemeMode, Record<string, string>>

export type SemanticColorName = keyof (typeof semanticColor)['light']
