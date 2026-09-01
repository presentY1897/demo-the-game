# 002. product 홈페이지 초기 로딩 (Lighthouse 모바일)

> S09. 대상: `apps/product`의 랜딩(`/ko`)과 문의 페이지(`/ko/contact`).

## 증상 / 문제

잠재 고객·채용 리뷰어가 처음 보는 화면이 마케팅 페이지다. 눈에 띄게 느리진 않았지만
**측정된 적이 없었다**. 특히 두 가지가 의심스러웠다.

- 전역 레이아웃이 웹폰트 CSS 두 개(jsDelivr의 Pretendard 동적 서브셋,
  Google Fonts의 IBM Plex Mono)를 `<head>`에서 **동기 로드**한다 → 렌더 차단 의심.
- 히어로의 `CaptionStage`가 한 글자씩 타이핑되며 자라는 자막 박스다 → CLS 의심.

## 측정

- 도구: Lighthouse 12.8.2 CLI, Chromium 140 (playwright 캐시 바이너리).
- 조건: **모바일 프리셋 기본값** — 화면 412×823(DPR 1.75), Slow 4G 시뮬레이션
  (RTT 150ms / 1,638kbps), **CPU 4× 스로틀**, `throttlingMethod: simulate`.
- 절차: 프로덕션 빌드 산출물을 정적 서버로 서빙 → 페이지당 **3회 실행, 중앙값**.
- 지표: Performance 점수, FCP, LCP, CLS, TBT.

### 재현 방법

`next.config.ts`가 `output: 'export'`이므로 `next start`는 동작하지 않는다
(Next가 명시적으로 거부한다). 대신 export 산출물을 gzip·캐시 헤더까지 흉내내는
최소 정적 서버로 서빙했다.

```bash
pnpm --filter @thegame/product build
node apps/product/scripts/serve-static.mjs apps/product/out 3021

CHROME_PATH=/home/hyun/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome \
pnpm dlx lighthouse@12 http://localhost:3021/ko \
  --only-categories=performance --output=json --output-path=./lh.json --quiet \
  --chrome-flags="--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage"
```

### 기준선 (개선 전, 3회 중앙값)

| 페이지 | Performance | FCP | LCP | CLS | TBT |
|---|---|---|---|---|---|
| `/ko` (랜딩) | **99** | 1.54s | **2.02s** | **0.028** | 10ms |
| `/ko/contact` | **98** | 1.74s | **2.10s** | 0.001 | 43ms |

3회 원시값 (`/ko`): 93 / 99 / 99 — 첫 회는 서드파티 폰트 CDN 콜드 커넥션 때문에
튄다. 이 변동성 자체가 아래 원인 분석의 단서였다.

## 원인 분석

### 1. LCP의 78%가 "렌더 대기"였다

LCP 요소는 히어로의 `<h1>`. Lighthouse의 LCP 단계 분해:

| 단계 | 시간 | 비중 |
|---|---|---|
| TTFB | 452ms | 22% |
| Load Delay / Load Time | 0ms | 0% |
| **Render Delay** | **1,569ms** | **78%** |

텍스트라 다운로드 비용이 0인데도 1.5초를 기다린다 → 렌더 차단 자원 문제.
`render-blocking-resources` 감사 결과:

| 자원 | 차단 |
|---|---|
| `fonts.googleapis.com/css2?family=IBM+Plex+Mono...` | 894ms |
| `cdn.jsdelivr.net/.../pretendardvariable-dynamic-subset.min.css` | 942ms |
| 앱 자체 CSS 3개 (합계 4.6KB) | 757ms |

서드파티 폰트 CSS 두 개가 차단 시간의 대부분을 차지한다. 자체 CSS는 이미 작다.

### 2. 한국어 페이지에서 폰트만 390KB

`network-requests` 감사: 총 전송량 546KB 중 **jsDelivr에서만 390KB**.
Pretendard 동적 서브셋은 한글을 `unicode-range`로 쪼갠 파일이라, 한국어 랜딩 페이지가
**woff2 서브셋 15개**를 끌어온다. 게다가 jsDelivr에 `preconnect`가 없어 연결 수립에
243ms를 더 쓴다(`uses-rel-preconnect`).

### 3. CLS 0.028의 출처는 타이핑 자막이었다

`layout-shifts` 감사가 지목한 노드:

| 노드 | 기여 |
|---|---|
| `span.CaptionStage_cursor` (`▌`) | 0.0135 + 0.0014 |
| `section#symposia` (아래 콘텐츠 밀림) | 0.0024 |
| 히어로 CTA 버튼 (웹폰트 swap) | 0.0006 |

원인은 두 가지다. (a) 자막이 확정되면 커서 `▌`를 **DOM에서 제거**해 인라인 폭이
줄고, (b) 타이핑이 진행되며 문장이 줄바꿈을 넘길 때 `.source`의 `min-height: 2.6em`
예약분을 넘어선다. 둘 다 자막 박스 아래 전체를 밀어 올린다.

### 4. TBT는 문제가 아니었다

`CaptionStage`의 55ms 간격 타이핑 리렌더가 TBT를 먹을 것으로 의심했으나,
측정값은 랜딩 **10ms** / 문의 43ms로 200ms 예산 대비 여유가 크다.
메인 스레드 총 작업 909ms, 스크립트 부팅 307ms, 롱태스크는 문서 파싱 118ms와
React 청크 66ms 두 건뿐이다. → **애니메이션 지연 시작/경량화는 하지 않는다.**
근거 없는 최적화를 넣지 않는 것도 결정이다.

### 5. 번들은 이미 서버 컴포넌트 중심이었다

`next build` 기준 랜딩 First Load JS 106KB (공유 102KB + 페이지 3.6KB).
클라이언트 컴포넌트는 `CaptionStage`(핵심 연출), `SiteHeader`(경로 기반 언어 전환),
`ContactForm`(폼 상태), `SetLang` 넷뿐이고 랜딩 본문·카드·푸터는 모두 서버 컴포넌트다.
줄일 여지는 `SetLang`(아래 개선 3)뿐이었다.

## 개선

_(작업 중 — 재측정 후 채운다)_

## 결과

_(작업 중)_

## 회귀 방지

_(작업 중)_
