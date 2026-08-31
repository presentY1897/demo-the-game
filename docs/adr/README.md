# Architecture Decision Records (ADR)

이 프로젝트의 아키텍처·기술 의사결정을 기록합니다.

## 왜 ADR인가

- 결정의 **근거와 당시 맥락**을 남겨, 나중에 "왜 이렇게 했지?"에 코드가 아닌 문서로 답합니다.
- 대안 비교를 강제하므로, 결정이 관성이 아닌 **트레이드오프 검토의 결과**임을 보장합니다.
- 리뷰어(면접관 포함)가 코드를 읽기 전에 설계 의도를 파악할 수 있습니다.

## 작성 규칙

- **결정한 시점에 즉시** 작성한다. 사후 기록은 미화된다.
- 한 문서 = 한 결정. **1페이지 이내**로 짧게.
- ADR로 남기는 기준: **되돌리기 비싼 결정** + **실제로 검토한 대안이 있었던 결정**.
  (포매터 규칙, 폴더 이름 같은 사소한 것은 남기지 않는다)
- 결정이 뒤집히면 기존 문서를 수정하지 않고, 새 ADR을 쓰고 기존 것을 `Superseded by`로 표시한다.
- 파일명: `NNNN-kebab-case-제목.md` (번호는 생성 순서, 재사용하지 않음)

## 상태(Status)

`Proposed` → `Accepted` → (`Deprecated` | `Superseded by [NNNN]`)

## 인덱스

| # | 제목 | 상태 |
|---|------|------|
| [0001](./0001-pnpm-workspace-monorepo.md) | pnpm workspace 기반 모노레포 채택 | Accepted |
| [0002](./0002-live-demo-expo-react-native.md) | 라이브 데모를 Expo 기반 React Native로 구현 | Accepted |
| [0003](./0003-sse-for-broadcast-ws-for-conversation.md) | 학회 자막은 SSE, 병원 대화는 WebSocket | Accepted |
| [0004](./0004-internal-packages-source-only.md) | 공유 패키지는 TS 소스로 직접 배포 (JIT) | Accepted |
