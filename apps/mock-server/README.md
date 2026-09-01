# @thegame/mock-server

실제 STT/번역 백엔드 자리를 대신하는 목 스트리밍 서버.
`@thegame/realtime`의 zod 스키마를 그대로 공유하므로 클라이언트와 계약이 어긋날 수 없다.

## 실행

키 발급 없이 **저장소 클론만으로 그대로 돌아간다** — 환경변수는 전부 선택 사항이다.

```bash
pnpm install
pnpm --filter @thegame/mock-server dev     # 파일 변경 시 자동 재시작
pnpm --filter @thegame/mock-server start   # 재시작 없이 1회 실행
pnpm --filter @thegame/mock-server test    # vitest
pnpm --filter @thegame/mock-server typecheck
```

기본 주소는 `http://localhost:4010` (`PORT`로 변경).

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

대화 번역은 아래 **번역 폴백 체인**을 따른다 (`src/translate.ts`).

## 번역 폴백 체인

CareTalk 대화(`WS /ws/conversation`) 번역은 3단으로 내려간다. 설계 배경은
[ADR 0007](../../docs/adr/0007-translation-fallback-chain.md), 명세는
[S12](../../docs/specs/S12-translation-api.md).

| 단계 | 동작 | 조건 |
|---|---|---|
| ① 사전 매칭 | 자주 쓰는 진료 문구 표에서 즉답 | 무비용·결정적이라 **항상 최우선** |
| ② Azure Translator | v3.0 REST 호출, 타임아웃 3s, 결과는 LRU 캐시 | `AZURE_TRANSLATOR_KEY`가 있을 때만 |
| ③ `[demo]` 폴백 | 원문에 마커를 붙여 반환 (`[데모 번역] …` / `[demo] …`) | 키 없음 · 호출 실패 |

- **키가 없어도 회귀가 없다.** ①③만으로 기존과 똑같이 동작한다.
- **캐시**: (출발 언어, 대상 언어, 원문) → 번역, 상한 1,000건 LRU. Azure **성공** 결과만
  담으므로 실패가 캐시에 굳지 않는다. 같은 문장을 반복하면 API를 다시 부르지 않는다.
- **실패는 무음이 아니다.** 실패 종류(`timeout` / `network` / `auth` / `rate-limit` /
  `server` / `client` / `bad-response`)를 구분해 경고 로그를 남기고, 결과의
  `failure` 필드로도 올려보낸다. 그래도 **대화 흐름은 막지 않는다** — 항상 표시 가능한
  문자열이 나온다.
- **연속 실패 차단기**: 3회 연속 실패하면 30초간 ②를 건너뛰고 바로 ③으로 간다. API가 죽었을 때
  메시지마다 3초씩 기다리지 않기 위해서다. 한 번 성공하면 즉시 해제된다.
- **키는 서버에만 둔다.** 클라이언트는 번역 API를 직접 호출하지 않는다.

### Symposia 자막은 대상이 아니다

학회 자막(`SSE /api/sessions/:id/stream`)은 **`src/data/keynote.ts`의 스크립트 내장 번역**을
그대로 재생하며 이 체인을 타지 않는다. 같은 강연이 재생마다 같은 품질로 나오는 **데모 결정성**이
실번역 이득보다 중요하기 때문이다. `sse.ts`가 `translate.ts`를 import 하지 않는다는 사실은
테스트(`src/__tests__/translate.test.ts`의 "범위 경계")로 강제된다.

## 환경변수

**전부 선택 사항이다.** 하나도 설정하지 않아도 서버는 정상 동작한다.

| 변수 | 기본값 | 설명 |
|---|---|---|
| `PORT` | `4010` | HTTP/WS 수신 포트 |
| `AZURE_TRANSLATOR_KEY` | *(없음)* | **이 값이 있을 때만** 번역 체인 ②가 켜진다. 없으면 ①③만 동작 |
| `AZURE_TRANSLATOR_REGION` | *(없음)* | 지역 전용 리소스일 때 필요. 있으면 `Ocp-Apim-Subscription-Region` 헤더로 전송 |
| `AZURE_TRANSLATOR_ENDPOINT` | `https://api.cognitive.microsofttranslator.com` | 전역 엔드포인트 대신 전용 엔드포인트를 쓸 때 |
| `AZURE_TRANSLATOR_TIMEOUT_MS` | `3000` | ② 호출 타임아웃. 숫자가 아니거나 0 이하면 기본값 |

키는 Azure Portal에서 **Translator** 리소스를 만들면 발급된다 (F0 = 월 200만 자 무료).
앱의 `zh`는 Azure 요청 시 간체 `zh-Hans`로 변환된다.

```bash
# 실번역을 켜서 실행
AZURE_TRANSLATOR_KEY=<key> AZURE_TRANSLATOR_REGION=koreacentral \
  pnpm --filter @thegame/mock-server dev
```

> 키를 셸 히스토리나 저장소에 남기지 마라. 로컬에서는 `.env`(gitignore 대상)나
> 셸 프로필에 두고 쓴다.

### 실키 스모크 절차 (수동)

자동 테스트는 mock으로 계약만 검증한다 — 실제 키로 도는 테스트는 **없다**. 키를 받았다면
아래를 1회 확인한다.

1. 위 명령으로 키를 넣고 서버를 띄운다.
2. `apps/live-demo`에서 CareTalk 방에 환자(`en`)로 입장한다.
3. **사전에 없는** 자유 문장을 보낸다 (예: `The weather is unusually cold this morning.`).
4. 번역문에 `[데모 번역]` / `[demo]` 마커가 **없으면** ② 경로가 살아 있는 것이다.
5. 같은 문장을 한 번 더 보낸다 → 서버 로그에 추가 호출이 없어야 한다(캐시 히트).
6. 키를 지우고 재시작해 3번을 반복 → 다시 `[데모 번역]` 마커가 붙으면 폴백 정상.
