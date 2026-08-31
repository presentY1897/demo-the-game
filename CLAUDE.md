# 프로젝트 컨벤션 (AI 협업 가이드)

더게임 지원용 데모 프로젝트. pnpm workspace 모노레포.

## Git 워크플로

- **bare + worktree 레이아웃**: 저장소 최상단은 `.bare/`(bare repo)와 브랜치별
  worktree 디렉토리(`main/`, `feature-xxxx/`)로 구성된다. 최상단에서 직접 파일을
  수정하지 않는다 — 모든 작업은 worktree 디렉토리 안에서 한다.
- 새 작업은 `git worktree add feature-<이름> -b feature-<이름> main`으로
  worktree를 만들어 진행하고, 완료 후 main에 **rebase 후 fast-forward 머지**한다.
- `pull.rebase=true`, `rebase.autoStash=true`가 저장소 설정에 켜져 있다.
  merge 커밋을 만들지 않는다.

## 구조

- `apps/corporate` — 기업 홈페이지 (Next.js, 다국어/SEO)
- `apps/product` — 제품 홈페이지 (Next.js)
- `apps/live-demo` — 실시간 번역 데모 (Expo React Native + react-native-web)
- `apps/mock-server` — SSE/WebSocket 목 스트리밍 서버 (Node)
- `packages/ui` — 웹 디자인 시스템 + Storybook
- `packages/tokens` — 디자인 토큰 (웹/RN 공유)
- `packages/realtime` — SSE/WS 클라이언트 추상화 (플랫폼별 구현 주입)
- `packages/i18n` — 다국어 리소스/유틸
- `packages/config` — tsconfig/eslint 공유 설정

## 규칙

- 패키지 매니저는 pnpm만 사용한다. npm/yarn 명령을 제안하지 않는다.
- 아키텍처급 결정(되돌리기 비싼 것)은 코드 작업 전에 `docs/adr/`에 ADR을 먼저 쓴다.
  형식은 `docs/adr/0000-template.md`.
- 성능 개선은 `docs/perf/` 형식대로 측정 수치와 함께 기록한다.
- 실시간 메시지 타입은 discriminated union으로 정의하고 `packages/realtime`에서만 파싱한다.
- 에러 처리: 네트워크/스트림/렌더 에러를 구분해 처리하고, 무음 실패(silent failure)를 만들지 않는다.
- 커밋: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `perf:`, `chore:`),
  스코프는 워크스페이스명 (예: `feat(live-demo): ...`).
- UI 문자열은 하드코딩하지 않고 `packages/i18n` 리소스를 통해 사용한다 (ko/en).
