# @thegame/mock-server

실제 STT/번역 백엔드 자리를 대신하는 목 스트리밍 서버.
`@thegame/realtime`의 zod 스키마를 그대로 공유하므로 클라이언트와 계약이 어긋날 수 없다.
스트림 이벤트는 `@thegame/realtime/types`, HTTP 요청·응답은 `@thegame/realtime/http`가
계약의 정본이다.

## 실행

키 발급 없이 **저장소 클론만으로 그대로 돌아간다** — 환경변수는 전부 선택 사항이다.

```bash
pnpm install
pnpm --filter @thegame/mock-server dev     # 파일 변경 시 자동 재시작
pnpm --filter @thegame/mock-server start   # 재시작 없이 1회 실행
pnpm --filter @thegame/mock-server test    # vitest (유닛 + 실서버 통합)
pnpm --filter @thegame/mock-server typecheck
```

기본 주소는 `http://localhost:4010` (`PORT`로 변경).

상태는 전부 메모리에 있다 — 영속화 없음, 재시작하면 방·세션·설정이 초기화된다.
인증도 없다(데모 한계, F01/F02에 문서화).

## 배포 (Render)

무료 웹 서비스 1개로 배포한다 (ADR-0006). 저장소 루트의 `render.yaml`이 Blueprint다 —
Render 대시보드에서 **New + → Blueprint**로 이 저장소를 고르면 그대로 만들어진다.
클릭 순서와 환경변수 값의 출처는 [S07 배포 절차](../../docs/specs/S07-deployment.md#배포-절차-재현-가능--이-순서대로).

| 항목 | 값 | 왜 |
|---|---|---|
| 빌드 | `corepack enable && pnpm install --frozen-lockfile --filter @thegame/mock-server...` | 9개 워크스페이스 중 목 서버에 필요한 3개만 설치 |
| 시작 | `pnpm --filter @thegame/mock-server start` | `tsx`가 TS를 그대로 실행 — 컴파일 산출물이 없다 |
| 헬스 체크 | `/health` | 슬립에서 깨어난 뒤 준비 판정. CORS와 무관하게 200 |
| 플랜 | Free (Singapore) | 카드 등록 불필요. 15분 무트래픽 시 슬립 → 콜드스타트 수십 초 |

### CORS 화이트리스트

`ALLOWED_ORIGINS`가 **비어 있으면 지금까지와 똑같이 `*`** 다. 값이 있을 때만 좁혀진다.

```bash
ALLOWED_ORIGINS="https://thegame-live-demo.vercel.app,https://*.vercel.app" \
  pnpm --filter @thegame/mock-server start
```

- `*`는 **점을 넘지 않는 한 조각**에만 대응한다 — `https://*.vercel.app`은
  `https://demo-git-abc.vercel.app`을 받고 `https://a.b.vercel.app`은 받지 않는다.
  (누구나 `vercel.app`에 배포할 수 있으니 프리뷰가 필요할 때만 쓴다.)
- 대소문자·트레일링 슬래시 차이는 흡수한다.
- **`Origin` 헤더가 없는 요청은 막지 않는다** — curl·Expo 네이티브 앱·Render 헬스체크가
  여기 해당한다. CORS는 브라우저의 규칙이지 인증이 아니다.
- **WebSocket 핸드셰이크(`/ws/conversation`)도 같은 목록으로 검사한다.** WS에는 CORS가
  적용되지 않아 브라우저가 막아주지 않으므로 서버가 직접 `403`으로 거절한다.
- 차단은 무음이 아니다 — 오리진마다 한 번씩 `[mock-server] CORS 차단: …` 경고를 남긴다.

부팅 로그가 현재 모드를 알려준다:

```
[mock-server] CORS: 모든 오리진 허용 (ALLOWED_ORIGINS 미설정 — 로컬 개발 기본값)
[mock-server] CORS: https://thegame-live-demo.vercel.app 만 허용
```

## 엔드포인트

에러 응답은 모두 `{ error, message }` 형태다. `error`는 분기용 안정 코드
(`not-found` · `invalid-body` · `invalid-json` · `invalid-transition` · `invalid-rate` ·
`unsupported-language` · `empty-language-list` · `method-not-allowed` · `internal-error`),
`message`는 사람이 읽는 설명이다.

## Symposia — 세션 (S13)

세션은 **부팅 시 자동 재생되지 않는다**. 데모용 `keynote-01` 한 건이 `waiting`
상태로 시드되어 있고, 운영 콘솔이 시작시켜야 자막이 흐른다.

상태: `waiting` → `playing` ⇄ `paused` → `ended`. 종료된 세션은 어떤 조작도 받지 않는다(409).

| 메서드 | 경로 | 설명 |
|---|---|---|
| `GET` | `/api/sessions` | 세션 목록 (`state`·`viewerCount` 포함) |
| `POST` | `/api/sessions` | 세션 생성 → `201` 세션 요약 |
| `GET` | `/api/sessions/:id/status` | `{ state, viewerCount, position, total, rate }` |
| `POST` | `/api/sessions/:id/start` | 대기 → 재생 |
| `POST` | `/api/sessions/:id/pause` | 재생 → 일시정지 |
| `POST` | `/api/sessions/:id/resume` | 일시정지 → 재생 |
| `POST` | `/api/sessions/:id/end` | → 종료, `session-ended` 브로드캐스트 |
| `POST` | `/api/sessions/:id/rate` | `{ rate: 0.5–2 }` 재생 속도 |
| `GET` | `/api/sessions/:id/stream?lang=en` | SSE 자막 스트림 |

- 제어 엔드포인트(`start`·`pause`·`resume`·`end`·`rate`)는 모두 성공 시 `status`와
  같은 본문을 돌려준다 — 조작 후 재조회가 필요 없다.
- `POST /api/sessions` 본문은 `{ title, speaker, sourceLang, targetLangs }`.
  자막 소스는 keynote 스크립트 템플릿을 복제하므로 언어는 템플릿이 가진 것
  (`ko`·`en`·`ja`·`zh`) 중에서만 고를 수 있다. 새 세션의 `id`는 사람이 받아 적을 수
  있는 6자리 코드이며 그대로 입장 코드로 쓴다(S02).
- 스크립트를 끝까지 재생하면 자동으로 `ended`가 되고 `session-ended`를 보낸다.

```bash
curl -X POST http://localhost:4010/api/sessions/keynote-01/start
curl -N 'http://localhost:4010/api/sessions/keynote-01/stream?lang=en'
```

### SSE 스트림

학회 강연 스크립트를 실시간처럼 재생하는 **공유 브로드캐스트** — 모든 시청자가
같은 시점을 본다.

- 부분 자막(단어 단위 진행, `isFinal: false`) → 원문 확정 → 번역 지연(400ms) 후
  언어별 확정 자막 순서로 흐른다. 실제 STT→번역 파이프라인의 UX를 시뮬레이션.
- **재연결 복구**: 확정 이벤트에만 SSE `id:`를 붙인다. `Last-Event-ID` 헤더
  (네이티브 자동 재연결) 또는 `?lastEventId=` 쿼리(수동 재연결)로 놓친 확정
  자막만 다시 받는다. 부분 자막은 휘발성이라 복구하지 않는다.
- `lang` 쿼리로 원문 + 선택 언어만 수신 (생략 시 전체 언어).
- 15초 간격 하트비트. 대기·종료 상태에서도 연결은 유지된다.

## CareTalk — 방 (S01)

| 메서드 | 경로 | 설명 |
|---|---|---|
| `POST` | `/api/rooms` | `201 { roomId, inviteCode }` |
| `GET` | `/api/rooms/:inviteCode` | `200 { roomId, inviteCode }` · `404` |

- `inviteCode`는 혼동 문자 `0/O/1/I`를 뺀 대문자 영숫자 6자리. 조회는 대소문자와
  앞뒤 공백을 무시한다(환자가 손으로 입력하는 값).
- 방은 **마지막 활동 24시간 뒤** 정리된다. 마지막 참여자가 나가도 방은 남으므로
  새로고침·재접속으로 같은 코드로 돌아올 수 있다.

### `WS /ws/conversation`

병원 1:1 대화 통역. 클라이언트 커맨드(`join`/`say`/`typing`)는
`clientCommandSchema`로 검증하며, 위반 시 `error` 이벤트로 응답한다.

- `join {roomId, role, lang}` → `joined`. **`joined`는 방 전체에 브로드캐스트된다** —
  의료진 대기 화면이 환자 입장을 감지하는 신호다(이벤트 스키마는 그대로).
- 초대 코드 해석은 HTTP가 맡고 WS는 `roomId`만 받는다 — 실시간 프로토콜 무변경.
- `POST /api/rooms` 없이 클라이언트가 만든 `roomId`로 join하면 방이 새로 생긴다
  (기존 1인 봇 데모 호환).
- `say {text}` → 방 전체에 번역이 붙은 `message` 브로드캐스트
- 실제 의료진(staff)이 없는 방에서는 **봇이 의료진 역할을 대행** —
  typing 인디케이터 후 진료 시나리오 순서대로 응답한다 (1인 데모용).
  staff가 들어오는 순간, 이미 예약된 응답까지 침묵한다.

대화 번역은 아래 **번역 폴백 체인**을 따른다 (`src/translate.ts`).

## CareTalk — 관리자 (S14)

| 메서드 | 경로 | 설명 |
|---|---|---|
| `GET` | `/api/admin/rooms` | `[{ inviteCode, memberCount, roles, lastActivityAt, botActive }]` |
| `GET` | `/api/admin/settings` | `{ patientLangs, supportedLangs }` |
| `PUT` | `/api/admin/settings` | `{ patientLangs: [...] }` → 저장된 설정 |

- **현황에는 대화 내용이 들어가지 않는다.** 응답 스키마(`adminRoomSchema`)가 strict라
  필드를 하나라도 늘리면 계약 테스트가 먼저 깨진다(F02).
- `lastActivityAt`은 epoch ms. 참여자가 0명인 방도 TTL 전까지는 목록에 남는다
  (`memberCount: 0`) — "종료된 상담"으로 표시할지는 화면 판단.
- `patientLangs`는 `supportedLangs` 안에서만 고를 수 있고 빈 배열은 거부한다.

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
| `PORT` | `4010` | HTTP/WS 수신 포트. Render는 이 값을 자동 주입한다 |
| `ALLOWED_ORIGINS` | *(없음 = `*`)* | CORS 허용 오리진 화이트리스트 (쉼표 구분). **없으면 예전처럼 모든 오리진을 허용한다** — 로컬 개발은 그대로다. 아래 [배포](#배포-render) 참고 |
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
