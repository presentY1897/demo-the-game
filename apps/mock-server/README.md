# @thegame/mock-server

실제 STT/번역 백엔드 자리를 대신하는 목 스트리밍 서버.
`@thegame/realtime`의 zod 스키마를 그대로 공유하므로 클라이언트와 계약이 어긋날 수 없다.

```bash
pnpm --filter @thegame/mock-server dev   # http://localhost:4010 (PORT로 변경 가능)
```

## 엔드포인트

### `GET /api/sessions`

세션 메타데이터 목록.

### `GET /api/sessions/:id/stream?lang=en` (SSE)

학회 강연 스크립트를 실시간처럼 재생하는 **공유 브로드캐스트** — 모든 시청자가
같은 시점을 본다.

- 부분 자막(단어 단위 진행, `isFinal: false`) → 원문 확정 → 번역 지연(400ms) 후
  언어별 확정 자막 순서로 흐른다. 실제 STT→번역 파이프라인의 UX를 시뮬레이션.
- **재연결 복구**: 확정 이벤트에만 SSE `id:`를 붙인다. `Last-Event-ID` 헤더
  (네이티브 자동 재연결) 또는 `?lastEventId=` 쿼리(수동 재연결)로 놓친 확정
  자막만 다시 받는다. 부분 자막은 휘발성이라 복구하지 않는다.
- `lang` 쿼리로 원문 + 선택 언어만 수신 (생략 시 전체 언어).
- 15초 간격 하트비트.

```bash
curl -N 'http://localhost:4010/api/sessions/keynote-01/stream?lang=en'
```

### `WS /ws/conversation`

병원 1:1 대화 통역. 클라이언트 커맨드(`join`/`say`/`typing`)는
`clientCommandSchema`로 검증하며, 위반 시 `error` 이벤트로 응답한다.

- `join {roomId, role, lang}` → `joined`
- `say {text}` → 방 전체에 번역이 붙은 `message` 브로드캐스트
- 실제 의료진(staff)이 없는 방에서는 **봇이 의료진 역할을 대행** —
  typing 인디케이터 후 진료 시나리오 순서대로 응답한다 (1인 데모용).

번역은 데모용: 자주 쓰는 진료 문구 사전 + `[demo]` 마커 폴백 (`src/translate.ts`).
