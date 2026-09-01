# S10. 품질 인프라 — eslint · CI · 테스트 확장

- **갈래**: 인프라 · **의존**: 없음 (병행 가능; 대규모 재편 S01–S03과 같은 파일을 만질
  때만 순서 조율) · **판정**: 대기

## 배경

- `packages/config`에 tsconfig만 있고 eslint 공유 설정이 없다 (CLAUDE.md가 선언한
  "tsconfig/eslint 공유 설정"의 절반만 구현됨). turbo `lint` 태스크는 선언만 존재.
- CI가 없어(`.github` 부재) typecheck/test가 로컬 수동 실행에 의존한다.
- 테스트가 realtime의 backoff/sse/types 3파일뿐 — 큐 flush나 스토어 리듀서처럼
  회귀 위험이 큰 로직이 미커버.

## 명세

### eslint

- `packages/config`에 flat config 프리셋 3종: `base`(ts) / `react`(웹) / `rn`(Expo).
- 각 워크스페이스에 `lint` 스크립트 연결. 규칙은 recommended 수준 + 프로젝트 규칙
  2가지를 커스텀으로: UI 문자열 하드코딩 감지(가능 범위), `packages/realtime` 외부에서의
  이벤트 JSON.parse 금지.

### CI (GitHub Actions)

- 트리거: PR + main push. 단계: pnpm 캐시 → `turbo run lint typecheck test build`.
- turbo 캐시를 Actions 캐시에 연결해 미변경 워크스페이스는 스킵.
- (S09 선택 항목) Lighthouse CI 잡은 별도 워크플로로.

### 테스트 확장

| 대상 | 검증할 것 |
|---|---|
| `realtime/ws.ts` | 오프라인 전송 큐: 끊김 중 send → 재연결 시 순서대로 flush, 재연결 중 중복 전송 없음 |
| `live-demo/captionStore` | 부분 자막 같은 id 교체, 확정 시 번역 병기 병합, 재연결 복구 후 seq 순서 보장 |
| `live-demo/conversationStore` | 이벤트별 리듀서 분기(joined/message/typing/error), reset |
| `mock-server` 봇 | staff 실존 방에서 봇 침묵 (S01 회귀 테스트와 동일 — 한 번만 작성) |
| `tokens` 대비 | S06의 AA 대비 검사 (S06과 공유) |

- 스토어 테스트를 위해 live-demo에 vitest 도입 (RN 컴포넌트 렌더 테스트는 범위 외 —
  스토어/로직 단위만).

## 완성 기준

1. `pnpm lint`가 전 워크스페이스에서 의미 있게 돈다 (0 error 기준선 확립).
2. PR에서 lint/typecheck/test/build가 자동 실행되고 실패 시 머지가 막힌다.
3. 위 표의 테스트가 추가되고 통과한다.

## 테스트

- 이 명세는 테스트 인프라 자체다. "테스트 확장" 표는 각 S 명세의 테스트 섹션을 취합한
  인덱스이며, 세부 케이스의 정본은 각 명세(S01·S05·S06·S08 등)다 — 이중 관리하지 않는다.
- 메타 검증: 의도적으로 실패하는 커밋 1건으로 lint/typecheck/test/build 각 잡이 실제로
  머지를 막는지 확인 후 되돌린다.

## 작업 분해

1. eslint 프리셋 + 워크스페이스 연결 + 기준선 정리
2. GitHub Actions 워크플로 + turbo 캐시
3. ws 큐 테스트 → 스토어 테스트 → 봇/대비 테스트

## 범위 제외

E2E(Playwright/Detox), 커버리지 목표치, 시각 회귀 테스트.
