# S06. 접근성 패스

- **갈래**: UX · **의존**: S02 이후 권장(동선 확정 후) · **판정**: 대기

## 배경 (진단 근거)

`accessibilityRole` 등 접근성 속성이 13곳에 산발적으로만 있고 기준이 없다. 의료 서비스
특성상 고령·저시력 사용자 비중이 높아 접근성은 제품 요구사항에 가깝고, 채용 관점에서도
"기준을 정하고 전수 적용"한 이력이 어필 포인트다.

## 명세

### 기준 (이 프로젝트의 접근성 계약)

1. **대비**: 텍스트/배경 조합 WCAG AA(일반 4.5:1, 대형 3:1). 라이트·다크 모두.
2. **라벨**: 모든 인터랙티브 요소에 `accessibilityRole` + 의미 있는 `accessibilityLabel`
   (아이콘 버튼 필수), 상태 변화는 `accessibilityState`.
3. **터치 타깃**: 최소 44×44pt (칩·아이콘 버튼 포함).
4. **폰트 스케일**: OS 글자 크기 확대 시 잘림 없이 동작 (`allowFontScaling` 기본 유지,
   고정 높이 컨테이너 제거). 자막 화면은 자체 A−/A＋와 중첩돼도 깨지지 않아야 함.
5. **웹(product)**: 시맨틱 태그·폼 라벨 연결·키보드 포커스 스타일 — 기존 컴포넌트 점검.

### 검증 장치

- **대비 검사 테스트**: `packages/tokens`에 조합별 대비를 계산하는 유닛 테스트 추가 —
  토큰 값이 바뀌면 CI에서 걸린다(S10과 연동).
- **체크리스트 통과**: 세 여정(참석자 자막 시청 / 의료진 방 개설 / 환자 코드 입장)을
  스크린리더(VoiceOver 또는 TalkBack)로 완주하는 체크리스트를 이 문서 하단에 기록.

## 완성 기준

1. 대비 테스트가 전 토큰 조합에서 통과한다.
2. 인터랙티브 요소 전수에 role/label이 있다 (수동 감사 목록 첨부).
3. OS 폰트 최대 확대에서 세 여정이 완주 가능하다.
4. 스크린리더 체크리스트 3개 여정 통과 기록.

## 테스트

- 자동: tokens 대비 AA 유닛 테스트(라이트·다크 전 조합) — CI(S10) 상시 실행, 토큰 변경 시
  회귀 차단.
- 자동(웹): `eslint-plugin-jsx-a11y` 규칙을 S10 프리셋에 포함.
- 수동: 스크린리더(VoiceOver 또는 TalkBack) 3여정 완주 체크리스트(결과를 이 문서 하단에
  기록), OS 폰트 최대 확대 완주, 터치 타깃 44pt 감사표.

## 작업 분해

1. 대비 계산 유닛 테스트 (tokens)
2. live-demo 전 화면 감사 → role/label/state 적용
3. 터치 타깃·폰트 스케일 수정
4. product 폼/포커스 점검
5. 스크린리더 여정 테스트 + 기록

## 범위 제외

WCAG AAA, 국제 인증 수준 감사, 스위치 컨트롤 등 보조기기별 최적화.

## 구현 메모 — 대비 검사 장치 + 웹(product) (2026-09-01)

이 메모가 다루는 범위는 **검증 장치의 "대비 검사 테스트"와 기준 5(웹)**뿐이다.
기준 2(라벨)·3(터치 타깃)·4(폰트 스케일)의 live-demo 전 화면 감사는 다른 담당이 이어서 한다.
`apps/live-demo` 소스는 이 작업에서 건드리지 않았다 — 다만 토큰 값이 바뀌어 화면 색은 바뀐다.

### 대비 검사 테스트 (`packages/tokens`)

`vitest`를 도입하고(`test: vitest run`, 다른 워크스페이스와 같은 `^3.2.0`)
`src/contrast.ts` + `src/__tests__/contrast.test.ts`를 추가했다. 80 케이스.

**검사 대상 조합을 고르는 규칙** (`contrast.ts`의 doc comment가 정본):

1. **배경으로 쓰이는 토큰만** 배경 축에 올린다 — `bg`/`surface`/`surfaceSubtle`/
   `primary`/`primaryHover`/`primarySubtle`/`danger`.
2. 각 배경 위에 **실제로 렌더되는 전경 토큰만** 짝짓는다. 항목마다 `usedAt`(어느 화면인지)이
   붙어 있고, 이게 목록의 근거다. **곱집합은 돌리지 않는다** — 시맨틱 토큰 16개의 곱집합은
   240쌍인데 같이 화면에 나오는 건 30쌍이 안 되고, 안 쓰는 조합까지 빨개지면 신호가 죽는다.
3. 상태 톤(`success`/`warning`/`danger`/`info`)만 예외로 중립 표면 3종 전부와 짝짓는다 —
   상태 배지·상태 문구는 화면 배경·카드·서브틀 행 어디에나 놓이고, 어디 놓일지 컴포넌트가
   미리 정하지 않는다.
4. 기준은 **일반 텍스트 4.5:1로 통일**한다. 이 목록에 "항상 대형 텍스트"인 조합은 없다 —
   히어로 제목조차 좁은 화면에서는 24px 아래로 내려간다.
5. 비텍스트(1.4.11, 3:1)는 **컨트롤 경계와 포커스 인디케이터만** 검사한다.
6. 제외한 조합은 `excludedPairs`에 **이유와 함께** 남기고, 테스트가 그 형식을 검증한다.

결정 배경은 [ADR 0009](../adr/0009-contrast-as-token-contract.md).

### 발견한 미달과 토큰 수정 (25조합)

라이트 세트는 손댄 적이 없어서 미달이 몰려 있었다. 다크는 S04가 자막 화면 조합만 봤기 때문에
콘솔·관리자 화면에서 쓰는 `info`/`success`/`warning`이 남아 있었다.

| 토큰 | before | after | 고친 이유 (최악 조합 기준) |
|---|---|---|---|
| light `textMuted` | `neutral[500]` #6B7A7A | `neutral[600]` #4E5C5C | bg 4.48 → 6.98, `surfaceSubtle` 4.24 → 6.60 |
| light `primary` | `teal[600]` #0E837E | `teal[700]` #0D6863 | `primarySubtle` 4.35 → 6.26 (활성 칩·재개 배너 라벨) |
| light `primaryHover` | `teal[700]` | `teal[800]` #0F524E | primary가 한 단 내려가 hover가 겹쳤다 (onPrimary 6.61 → 8.98) |
| light `accent` | `coral[500]` #F76A4D | `coral[700]` #C4432A (신규) | bg 2.95 → 5.02 (404 상태 코드, 14px) |
| light `success` | `green[500]` #16A34A | `green[600]` #15803D | `surfaceSubtle` 3.12 → 4.75 |
| light `warning` | `amber[500]` #D97706 | `amber[600]` #B45309 | `surfaceSubtle` 3.01 → 4.75 |
| dark `success` | `green[500]` | `green[400]` #22C55E (신규) | `surfaceSubtle` 4.12 → 5.95 |
| dark `warning` | `amber[500]` | `amber[400]` #F59E0B (신규) | `surfaceSubtle` 4.26 → 6.32 |
| dark `info` | `blue[500]` #2563EB | `blue[400]` #60A5FA (신규) | `surfaceSubtle` 2.62 → 5.34, bg 3.58 → 7.28 |
| dark `primarySubtle` | `teal[900]` #103F3D | `teal[950]` #0C3230 (신규) | `textMuted` 4.36 → 5.19 (재개 배너의 "닫기") |
| **신규** `borderStrong` | — | 두 모드 `neutral[500]` #6B7A7A | 컨트롤 경계 라이트 1.29 → 4.48, 다크 1.92 → 4.13 (최악 3.03) |

`danger`는 양쪽 모두 그대로다 (라이트 `red[500]` 4.57~4.83, 다크 `red[400]` 4.90~6.69).
S04가 다크에 넣은 `red[400]` 조치는 유지된다.
`teal[900]`은 CaptionStage 무대 배경이 직접 쓰므로 건드리지 않고 `teal[950]`을 새로 뒀다.

부수 수정 2건:
- `packages/ui` `Button.danger`가 글자색을 `#ffffff`로 하드코딩하고 있었다. 다크에서
  `danger`가 `red[400]`이라 흰 글자는 2.19:1이다 → `var(--tg-color-on-primary)`로 바꿔
  라이트 4.83 / 다크 6.02.
- `ChatPreview`의 번역문은 `color-mix(on-primary 78%)`라 토큰이 아니라 합성색인데,
  `primary`가 한 단 내려가면서 3.44 → 4.72(라이트) / 4.65(다크)로 같이 올라왔다.

### `border`/`bg` 미달을 어떻게 처리했나 (S04가 넘긴 항목)

**둘로 쪼갰다.** `border` 하나가 두 가지 일을 하고 있었던 게 문제였다.

- **장식용 hairline**(헤더/푸터 구분선, 카드 외곽선)은 **검사에서 제외**했다.
  WCAG 1.4.11은 "순수 장식"과 "정보를 전달하지 않는 그래픽"을 명시적으로 제외한다 —
  이 선들이 안 보여도 읽을 수 있는 내용이나 조작할 수 있는 컨트롤이 하나도 줄지 않는다.
  제외 사실과 이유는 `excludedPairs`에 코드로 남겼다.
- **컨트롤 경계**(입력·textarea·칩)는 제외 대상이 아니다. 1.4.11은 "UI 컴포넌트를
  식별하는 데 필요한 시각 정보"에 3:1을 요구하고, 입력 칸의 경계가 정확히 그것이다.
  그래서 `borderStrong` 토큰을 새로 만들어 `packages/ui`의 `TextField`와 product의
  `ContactForm`(칩·textarea)에 적용했다. 라이트 4.48:1 / 다크 4.13:1(서브틀 행 위 3.03:1).
- **live-demo는 아직 `border`를 컨트롤 경계로 쓴다**(`QuickReplyBar` 칩, `LanguageStep`
  옵션 등 20여 곳). RN 담당이 `borderStrong`으로 바꿔야 한다 — **인계 항목**.

### 토큰 테스트가 다루지 않는 것 (인계)

배지의 `tone` 12% 틴트 배경은 **토큰 두 개의 조합이 아니라 컴포넌트의 알파 선택**이라
토큰 테스트 대상이 아니다. 토큰을 여기 맞추면 상태 톤이 화면 어디서든 과하게 진해진다.
측정값(토큰 수정 **후**):

| | 라이트 (bg/surface/surfaceSubtle) | 다크 (bg/surface/surfaceSubtle) |
|---|---|---|
| neutral | 5.83 / 5.83 / 5.55 | 5.79 / 5.09 / **4.13** |
| success | **4.27 / 4.27 / 4.04** | 6.72 / 5.92 / 4.81 |
| warning | **4.25 / 4.25 / 4.04** | 7.08 / 6.29 / 5.11 |
| danger | **4.01 / 4.01 / 3.79** | 5.73 / 5.08 / **4.12** |
| info | **4.36 / 4.36 / 4.15** | 6.03 / 5.36 / **4.35** |

굵은 값이 4.5 미달. `packages/ui`의 `Badge`와 live-demo의 `ConnectionBadge`/
`SessionStateBadge`가 틴트를 올리거나(≈25%) 라벨 색을 배경과 분리해야 한다.

### 웹(product) 점검 — 실측

헤드리스 크로미움 + axe-core 4.13.0 (`wcag2a/2aa/21a/21aa/best-practice`).
`pnpm --filter @thegame/product build` 후 `scripts/serve-static.mjs out 3099`로 띄워 측정.

| 대상 | before | after |
|---|---|---|
| `/ko` | 22 (color-contrast 20, heading-order 2) | **0** |
| `/en` | 22 (color-contrast 20, heading-order 2) | **0** |
| `/ko/contact` | 9 (color-contrast 9) | **0** |
| `/en/contact` | 9 (color-contrast 9) | **0** |
| `/nope` (404) | 4 (color-contrast 3, html-has-lang 1) | **0** |
| **정적 5개 합계** | **66** | **0** |
| 문의 폼 — 오류 상태 | 9 (color-contrast 9) | **0** |
| 문의 폼 — 접수 완료 상태 | 9 (color-contrast 8, heading-order 1) | **0** |
| `/ko` 모바일 390×844 | (미측정) | **0** |

고친 내용:

- **대비 61건**: 위 토큰 수정으로 전부 해소. 남은 건 없었다.
- **heading-order 4건**: 랜딩의 기능 카드·단계 제목이 `h2` 아래 `h4`였다 → `h3`.
  문의 접수 완료 카드의 `h3`은 `h1` 바로 아래라 `h2`로.
  404는 ko/en 블록이 각각 `h1`이었다 → 첫 블록만 `h1`, 두 번째는 `h2`.
- **html-has-lang 1건**: 전역 not-found는 루트 레이아웃이 둘이라 레이아웃 없이 렌더되고,
  컴포넌트에서 `<html>`을 직접 그리면 Next 래퍼 **안에** 중첩돼 `<html>`이 2개인 무효
  문서가 되며 테마 `<style>`까지 사라진다(측정으로 확인). 정적 HTML에 lang을 박을 자리가
  없어서 파싱 시점에 `document.documentElement.lang`을 지정했다. 스크린리더는 정적 소스가
  아니라 DOM을 읽으므로 3.1.1을 만족한다. 이 페이지는 `noindex`라 크롤러 손해는 없다.
  **Next의 제약이라 우회한 것**이며, 정적 HTML에는 여전히 lang이 없다.

axe가 못 잡는 것 중 함께 고친 것:

- **스킵 링크**(WCAG 2.4.1). 헤더 링크가 6개라 키보드·스위치 사용자는 페이지마다 6번을
  지나야 본문에 닿았다. `<body>` 첫 요소로 넣고 `<main id="main" tabIndex={-1}>`로 보낸다.
  실제로 눌러 포커스가 `MAIN#main`으로 가는 것을 확인했다.
- **하드코딩된 영어 aria-label**. `nav aria-label="Main"`, 언어 전환 링크
  `aria-label="Switch language"`가 ko 페이지에서도 영어로 읽혔다 → 사전으로 옮겼다
  (`nav.label`/`nav.switchLanguage`). 문의 링크에 `aria-current="page"`도 추가.
- **폼 오류 시 포커스 이동**. 이전에는 포커스가 `<body>`에 그대로 있어(측정 확인) 키보드
  사용자가 무슨 일이 일어났는지 알 수 없었다 → 첫 오류 필드로 옮긴다.
  `aria-invalid`/`aria-describedby`/`role="alert"`는 `TextField`에 이미 있었고, 연결이
  실제로 살아 있는지 DOM에서 확인했다(`describedby -> 오류 문구` 매핑 2건).
  폼 상단에 `<output>`(암묵 `role="status"`, live=polite) 요약을 두되 assertive는 겹치지 않게 했다.
- **접수 완료 시 포커스 이동**. 폼이 통째로 카드로 바뀌면서 포커스가 `<body>`로 떨어졌다
  → 결과 `<output tabIndex={-1}>`로 옮긴다. 접근성 트리에서 `role=status`/`live=polite` 확인.
- **문장 단위 `lang`**(WCAG 3.1.2). `ChatPreview`의 말풍선은 로케일과 무관하게 환자=영어,
  의료진=한국어로 고정인데 `lang`이 없어 ko 페이지에서 한국어 음성이 영어를 읽었다.
- **진입 스텁(`/`)**: 제목이 없었다 → 시각적으로 숨긴 `h1`. `English`/`한국어` 링크가
  색도 밑줄도 없어 본문과 구분되지 않았다(1.4.1) → 밑줄 + `lang`/`hrefLang`.

**키보드 탭 순서** (실제로 Tab 키를 보내 측정):

- `/ko` 12스톱: 스킵 링크 → 브랜드 → 내비 3 → 언어 전환 → 데모 → 히어로 CTA 2 →
  본문 링크 2 → CTA 밴드 버튼 → 문서 밖. 갇히는 곳 없음, 순서는 시각 순서와 일치.
- `/ko/contact` 14스톱: 헤더 7 → 입력 3 → 관심 칩 2 → textarea → 제출. 동일.
- **전 스톱에서 `outline: 2px solid`가 계산됐고**(`--tg-color-primary`), 브라우저가
  스크롤해 넣은 뒤 뷰포트 안에 있었다. 포커스가 안 보이는 요소는 없었다.
- 320px 뷰포트에서 두 페이지 모두 가로 스크롤 없음(1.4.10 리플로).

**jsx-a11y**: recommended 34규칙 기준으로 before 0건 / after 0건이었다. 0건이 "볼 게 없다"는
뜻은 아니라서, recommended에서 꺼져 있는 5개를 공용 react 프리셋에 추가했다
(`control-has-associated-label`, `no-aria-hidden-on-focusable`, `anchor-ambiguous-text`,
`lang`, `prefer-tag-over-role`). 강화한 프리셋 기준 **before 1건 / after 0건**:

- 기존 코드 1건 — `CaptionStage`의 `role="img"`. 타이핑 애니메이션이 도는 합성 그래픽이라
  `<img>`로 바꿀 대상이 아니다. **오탐으로 판단**하고 사유를 적은 disable을 달았다.
- 작업 중 새로 잡힌 2건 — `role="status"` 두 곳. 규칙 말대로 `<output>`으로 바꿨다(암묵
  role이 같고 폼 결과라는 의미까지 맞다).

### 미완 / 못 한 것

- **스크린리더 3여정 완주 체크리스트는 못 했다.** VoiceOver/TalkBack은 실기기와 보조기기가
  필요하고 이 환경에는 없다. 완성 기준 4는 **미완**이다 — 지어내지 않았다.
- 완성 기준 2(role/label 전수)·3(폰트 확대 완주)은 live-demo 감사 담당의 범위다.
- 배지 합성 배경 미달(위 표)과 live-demo의 `border` → `borderStrong` 교체는 인계 항목.
- 404의 `<html lang>`은 런타임에만 붙는다(위 참고).
