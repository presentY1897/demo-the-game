import { semanticColor, type SemanticColorName, type ThemeMode } from './color'

/** WCAG 2.1 최소 대비 (AA) */
export const WCAG_AA = {
  /** 일반 텍스트 (24px 미만, 또는 18.66px 미만의 굵은 글씨) */
  normalText: 4.5,
  /** 대형 텍스트 (24px 이상, 또는 18.66px 이상 bold) */
  largeText: 3,
  /** 비텍스트 — UI 컴포넌트 경계·상태, 포커스 인디케이터 (1.4.11) */
  nonText: 3,
} as const

/** '#RRGGBB' → 0..1 채널 3개 */
function channels(hex: string): [number, number, number] {
  const value = hex.trim()
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
    throw new Error(`대비 계산은 #RRGGBB 형식만 받는다: ${hex}`)
  }
  return [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16) / 255) as [number, number, number]
}

/** WCAG 2.1 상대 휘도 */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * (r as number) + 0.7152 * (g as number) + 0.0722 * (b as number)
}

/** WCAG 2.1 명도 대비 (1 ~ 21). 순서는 무관하다. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/** 모드의 시맨틱 토큰 두 개를 이름으로 받아 대비를 낸다 */
export function tokenContrast(mode: ThemeMode, fg: SemanticColorName, bg: SemanticColorName): number {
  return contrastRatio(semanticColor[mode][fg], semanticColor[mode][bg])
}

export interface ContrastPair {
  fg: SemanticColorName
  bg: SemanticColorName
  /** 이 조합이 실제로 쓰이는 곳 — 목록의 근거다 */
  usedAt: string
}

/**
 * ## 검사 대상 조합을 어떻게 고르는가
 *
 * 시맨틱 토큰의 **곱집합은 검사하지 않는다**. 절대 함께 쓰이지 않는 조합
 * (예: `danger` 텍스트 위의 `success` 텍스트)까지 걸려서 신호가 죽는다.
 * 대신 규칙은 이렇다.
 *
 * 1. **배경으로 쓰이는 토큰**만 배경 축에 올린다 —
 *    `bg` / `surface` / `surfaceSubtle` / `primary` / `primaryHover` / `primarySubtle` / `danger`.
 *    (`border`는 RN에서 hairline 한 곳에만 배경으로 쓰이고 그 위에 텍스트가 없다.)
 * 2. 각 배경 위에 **실제로 렌더되는 전경 토큰**만 짝짓는다. 아래 `usedAt`이 그 근거이고,
 *    새 조합을 화면에 도입하면 여기에 한 줄을 먼저 추가하는 것이 이 저장소의 규칙이다.
 * 3. 상태 톤(`success`/`warning`/`danger`/`info`)은 중립 표면 3종
 *    (`bg`/`surface`/`surfaceSubtle`) 전부와 짝짓는다 — 상태 배지·상태 문구는
 *    화면 배경·카드·서브틀 행 어디에나 놓이고, 어디에 놓일지 컴포넌트가 정하지 않는다.
 * 4. 기준은 **일반 텍스트 4.5:1**로 통일한다. 이 목록의 조합 중 "항상 대형 텍스트"인
 *    것은 없다 — 히어로 제목(`text`/`bg`)조차 작은 화면에서는 24px 아래로 내려간다.
 */
export const textPairs: readonly ContrastPair[] = [
  // --- bg (페이지·스크린 배경)
  { fg: 'text', bg: 'bg', usedAt: 'body 본문, 히어로 제목, 섹션 제목' },
  { fg: 'textMuted', bg: 'bg', usedAt: 'Text tone="muted", 헤더 내비, 푸터, 404 본문' },
  { fg: 'primary', bg: 'bg', usedAt: '아이브로우, 본문 링크, 헤더 브랜드, secondary 버튼 라벨' },
  { fg: 'accent', bg: 'bg', usedAt: '404 상태 코드' },
  { fg: 'success', bg: 'bg', usedAt: '상태 배지·상태 문구 (규칙 3)' },
  { fg: 'warning', bg: 'bg', usedAt: '상태 배지·상태 문구 (규칙 3)' },
  { fg: 'danger', bg: 'bg', usedAt: '스트림 오류 문구, 상태 배지 (규칙 3)' },
  { fg: 'info', bg: 'bg', usedAt: '대기 상태 배지 (규칙 3)' },

  // --- surface (카드·입력·말풍선)
  { fg: 'text', bg: 'surface', usedAt: 'Card 본문, TextField 입력값, 채팅 원문' },
  { fg: 'textMuted', bg: 'surface', usedAt: 'TextField hint·placeholder, 채팅 번역문, 비활성 칩 라벨' },
  { fg: 'primary', bg: 'surface', usedAt: '카드 안 링크·재시도 액션' },
  { fg: 'success', bg: 'surface', usedAt: '설정 저장 완료 문구 (LanguageBoard)' },
  { fg: 'warning', bg: 'surface', usedAt: '상태 배지·상태 문구 (규칙 3)' },
  { fg: 'danger', bg: 'surface', usedAt: 'TextField 에러 메시지' },
  { fg: 'info', bg: 'surface', usedAt: '상태 배지·상태 문구 (규칙 3)' },

  // --- surfaceSubtle (서브틀 행·칩·A−/A＋ 바)
  { fg: 'text', bg: 'surfaceSubtle', usedAt: '퀵 리플라이 칩 라벨, A−/A＋, ghost 버튼 hover' },
  { fg: 'textMuted', bg: 'surfaceSubtle', usedAt: '채팅 메타 라벨, 비활성 언어칩' },
  { fg: 'primary', bg: 'surfaceSubtle', usedAt: '재시도 액션, 서브틀 박스 안 링크' },
  { fg: 'success', bg: 'surfaceSubtle', usedAt: '상태 배지·상태 문구 (규칙 3)' },
  { fg: 'warning', bg: 'surfaceSubtle', usedAt: '상태 배지·상태 문구 (규칙 3)' },
  { fg: 'danger', bg: 'surfaceSubtle', usedAt: '오류 박스 문구 (LanguageBoard errorBox)' },
  { fg: 'info', bg: 'surfaceSubtle', usedAt: '상태 배지·상태 문구 (규칙 3)' },

  // --- primary / primaryHover / danger (채워진 버튼·말풍선)
  { fg: 'onPrimary', bg: 'primary', usedAt: 'primary 버튼, 활성 언어칩, 의료진 말풍선' },
  { fg: 'onPrimary', bg: 'primaryHover', usedAt: 'primary 버튼 hover' },
  { fg: 'onPrimary', bg: 'danger', usedAt: 'danger 버튼' },

  // --- primarySubtle (강조 배너·활성 칩·CTA 밴드)
  { fg: 'text', bg: 'primarySubtle', usedAt: 'CTA 밴드 제목' },
  { fg: 'textMuted', bg: 'primarySubtle', usedAt: 'CTA 밴드 본문, 재개 배너의 "닫기"' },
  { fg: 'primary', bg: 'primarySubtle', usedAt: '활성 칩 라벨, 재개 배너 라벨, 세션 생성 버튼' },
]

/**
 * 비텍스트 대비(1.4.11) 대상 — **컨트롤 경계와 포커스 인디케이터**만.
 * 기준 3:1.
 */
export const nonTextPairs: readonly ContrastPair[] = [
  { fg: 'borderStrong', bg: 'bg', usedAt: '입력·칩 테두리 (화면 배경 위)' },
  { fg: 'borderStrong', bg: 'surface', usedAt: 'TextField/textarea 테두리, 칩 테두리' },
  { fg: 'borderStrong', bg: 'surfaceSubtle', usedAt: '서브틀 행 위의 칩 테두리' },
  { fg: 'primary', bg: 'bg', usedAt: ':focus-visible 아웃라인' },
  { fg: 'primary', bg: 'surface', usedAt: ':focus-visible 아웃라인 (카드·폼 안)' },
  { fg: 'primary', bg: 'surfaceSubtle', usedAt: ':focus-visible 아웃라인 (서브틀 행)' },
]

/**
 * 의도적으로 **검사하지 않는** 조합. 제외했다는 사실 자체가 기록으로 남아야 해서
 * 목록으로 둔다 (테스트가 이 목록의 형식을 검증한다).
 */
export const excludedPairs: readonly { fg: SemanticColorName; bg: SemanticColorName; reason: string }[] = [
  {
    fg: 'border',
    bg: 'bg',
    reason:
      '`border`는 장식용 hairline 전용(헤더/푸터 구분선, 카드 외곽선)이다. WCAG 1.4.11은 ' +
      '"순수 장식"과 "정보를 전달하지 않는 그래픽"을 명시적으로 제외한다 — 이 선들을 못 봐도 ' +
      '읽을 수 있는 내용이나 조작할 수 있는 컨트롤이 하나도 줄지 않는다. 컨트롤 경계(입력·칩)는 ' +
      '제외 대상이 아니므로 `borderStrong`을 따로 두고 nonTextPairs에서 3:1로 검사한다.',
  },
  { fg: 'border', bg: 'surface', reason: '위와 같음 — 카드 외곽선.' },
  { fg: 'border', bg: 'surfaceSubtle', reason: '위와 같음 — 서브틀 행의 구분선.' },
]
