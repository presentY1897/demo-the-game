# S09. perf: product 홈페이지 Lighthouse

- **갈래**: 성능 · **의존**: 없음 (S11의 회사 소개 섹션 추가 후 재측정) · **판정**: 대기

## 배경

**대상: product 홈페이지의 초기 로딩 성능.** S08과 대상 앱·성능 축이 다르다 —
S08은 라이브 데모 앱의 런타임 갱신 비용, 이쪽은 마케팅 페이지가 처음 뜨는 속도와
시각 안정성(잠재 고객·채용 리뷰어의 첫 화면). 둘은 충돌하지 않고 둘 다 수행한다.

## 명세 — docs/perf 형식 준수

### 측정

- 도구: Lighthouse (Chrome DevTools 모바일 에뮬레이션 + Slow 4G/4× CPU), 3회 중앙값.
- 페이지: `/ko`(랜딩), `/ko/contact`. 프로덕션 빌드 기준 — product는 `output: 'export'`라
  `next start`가 동작하지 않는다. `next build` 산출물(`out/`)을 gzip·캐시 헤더를 붙이는
  정적 서버(`apps/product/scripts/serve-static.mjs`)로 서빙해 측정한다.
- 지표: Performance 점수, LCP, CLS, TBT. 기준선을 `docs/perf/002-product-lighthouse.md`에
  기록.

### 점검·개선 후보 (측정 결과로 선택)

- **폰트 로딩**: 웹폰트 사용 시 `next/font`로 자체 호스팅 + preload — FOUT/LCP 영향 확인.
- **CaptionStage 애니메이션**: 히어로의 자막 연출이 로드 직후 메인 스레드를 얼마나
  차지하는지(TBT) — 지연 시작 또는 경량화.
- **CLS**: 히어로·카드 영역의 치수 예약 여부.
- **번들**: `next build` 분석으로 불필요 클라이언트 컴포넌트 확인(랜딩은 대부분 서버
  컴포넌트여야 정상).

### 재측정·회귀 방지

- 동일 조건 재측정 → before/after 기록.
- (선택) Lighthouse CI를 S10의 GitHub Actions에 추가하고 성능 예산(예: LCP < 2.5s,
  CLS < 0.1)을 걸어 회귀를 막는다.

## 완성 기준

1. `docs/perf/002`에 전체 사이클이 수치와 함께 기록된다.
2. 모바일 Performance 점수와 LCP가 측정 가능하게 개선되거나, 이미 상한이면 그 근거가
   기록된다 (수치 없는 개선 주장 금지 규칙).

## 테스트

- 자동(선택): Lighthouse CI를 S10 워크플로에 추가, 예산 — LCP < 2.5s, CLS < 0.1 미달 시 실패.
- 수동: 모바일 에뮬 + Slow 4G/4× CPU, 3회 측정 중앙값 — 개선 전/후 동일 절차로 기록.

## 범위 제외

live-demo의 로딩 성능(Expo 웹 번들 — 별도 판단), 이미지 CDN 도입, 국제화 라우팅 구조 변경.
