# TheGame Demo — 의료 실시간 번역 플랫폼

더게임 프론트엔드 포지션 지원을 위한 데모 프로젝트입니다.

## 배경

지원 시점에 더게임의 제품과 홈페이지는 공개돼 있지 않았습니다(제품 출시 전 단계로 추정).
그래서 채용 공고의 요구사항에서 제품을 역산해, **입사 후 실제로 만들게 될 것**을
먼저 구현했습니다:

- 미용의료 학회의 실시간 번역 (서버 → 다수 참석자, 단방향 자막 스트리밍)
- 외국인 환자 병원의 대화 통역 (의료진 ↔ 환자, 양방향)
- 글로벌 대상 기업/제품 홈페이지
- pnpm workspace 모노레포로의 통합 (JD 명시 방향)

## 구조

| 워크스페이스 | 역할 | 스택 |
|---|---|---|
| `apps/corporate` | 기업 홈페이지 (다국어, SEO) | Next.js |
| `apps/product` | 제품 홈페이지 (학회용/병원용 제품 소개) | Next.js |
| `apps/live-demo` | 실시간 번역 라이브 데모 | Expo RN + react-native-web |
| `apps/mock-server` | 강연 스크립트를 SSE/WS로 재생하는 목 서버 | Node |
| `packages/ui` | 웹 디자인 시스템 | React + Storybook |
| `packages/tokens` | 디자인 토큰 (웹/RN 공유) | — |
| `packages/realtime` | SSE/WS 클라이언트 추상화 | TypeScript |
| `packages/i18n` | 다국어 리소스 | — |
| `packages/config` | tsconfig/eslint 공유 설정 | — |

## 문서

- **[아키텍처 의사결정 기록 (ADR)](./docs/adr/README.md)** — 왜 이렇게 만들었는가
- **[성능·안정성 개선 로그](./docs/perf/README.md)** — 측정 → 원인 분석 → 개선 기록
- **[중간 점검 (2026-09-01)](./docs/2026-09-01-checkpoint.md)** — 기능 스펙 정리와 남은 작업 계획
- **[CLAUDE.md](./CLAUDE.md)** — AI 협업 컨벤션 (Claude Code로 개발)

## 실행

```bash
pnpm install
pnpm dev   # 전체 워크스페이스 dev 서버
```

_(워크스페이스별 실행 방법은 각 앱 README에 추가 예정)_
