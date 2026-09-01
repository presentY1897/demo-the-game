# TheGame Demo — 의료 실시간 번역 플랫폼

더게임 프론트엔드 포지션 지원을 위한 데모 프로젝트입니다.

## 둘러보기

| | 링크 | 무엇 |
|---|---|---|
| 제품 홈페이지 | **https://thegame-product.vercel.app** | Symposia·CareTalk 소개, ko/en |
| 라이브 데모 | **https://thegame-live-demo.vercel.app** | 실시간 자막·대화 통역 (실제로 동작합니다) |
| 디자인 시스템 | **https://thegame-storybook.vercel.app** | Storybook |
| 목 서버 | https://thegame-mock-server.onrender.com/health | SSE/WS 백엔드 헬스 체크 |

**라이브 데모를 보는 법** — 목 서버가 무료 플랜이라 15분 유휴 후 잠들고, 첫 접속에
수십 초가 걸릴 수 있습니다. 세션은 자동 재생되지 않습니다(실제 학회처럼 운영자가 시작합니다).

1. [운영 콘솔](https://thegame-live-demo.vercel.app/console)에서 세션을 **시작**하고, 뜬 입장 코드를 복사
2. 다른 탭에서 [홈](https://thegame-live-demo.vercel.app)의 "세션 코드로 입장"에 붙여넣으면 자막이 흐릅니다
3. CareTalk은 한 탭에서 "새 대화 시작"(의료진) → 나온 **초대 코드/QR**을 다른 탭에서
   "초대 코드로 입장"(환자)으로 넣으면 두 기기 대화가 됩니다. 혼자 보실 땐 환자로만 들어가면
   봇이 의료진을 대행합니다.
4. [관리자 화면](https://thegame-live-demo.vercel.app/admin)에서 열린 상담 현황을 볼 수 있습니다.

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
| [`apps/product`](./apps/product/README.md) | 제품 홈페이지 (학회용/병원용 제품 소개, 다국어/SEO) | Next.js |
| [`apps/live-demo`](./apps/live-demo/README.md) | 실시간 번역 라이브 데모 | Expo RN + react-native-web |
| [`apps/mock-server`](./apps/mock-server/README.md) | 강연 스크립트를 SSE/WS로 재생하는 목 서버 | Node |
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

워크스페이스별 실행 방법은 위 구조 표의 각 앱 README를 참고하세요.
