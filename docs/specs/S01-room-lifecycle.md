# S01. 방 라이프사이클과 초대 코드 — CareTalk 2기기 실대화

- **갈래**: 구조 · **의존**: 없음 · **판정**: 대기

## 배경 (진단 근거)

`useConversation.ts`가 마운트마다 랜덤 방(`demo-xxxx`)을 새로 만들고 역할·언어를
`('patient', 'en')`으로 하드코딩한다. 의료진과 환자가 같은 방에 들어갈 방법이 없어
**2인 실대화가 구조적으로 불가능**하다. 서버(`conversation.ts`)는 임의 roomId join과
방 단위 브로드캐스트, staff 부재 시에만 봇이 응답하는 로직(`hasRealStaff`)을 이미
갖추고 있다 — 부족한 건 방을 "만들고 공유하는" 동선뿐이다.

## 명세

### 서버 (`apps/mock-server`)

- `POST /api/rooms` → `201 { roomId, inviteCode }`
  - `inviteCode`: 대문자 영숫자 6자리(혼동 문자 `0/O/1/I` 제외), 충돌 시 재생성.
  - 방은 메모리 보관, 마지막 활동 24시간 후 정리(타이머). 영속화 없음.
  - **마지막 참여자가 나가도 방을 지우지 않는다** — 새로고침·재접속으로 같은 코드로
    돌아올 수 있어야 하고, 정리는 TTL이 맡는다(구현하며 확정).
- `GET /api/rooms/:inviteCode` → `200 { roomId, inviteCode }` | `404 { error, message }`
  - 응답에 `inviteCode`를 함께 실어 `roomSchema` 하나로 두 엔드포인트를 파싱한다.
  - 코드 조회는 대소문자·앞뒤 공백을 무시한다(환자가 손으로 입력하는 값).
  - 코드 → roomId 해석은 HTTP로 하고, WS `join`은 기존 스키마(roomId) 그대로 사용
    — 실시간 프로토콜 무변경. 모르는 roomId로 join하면 방이 새로 생긴다(1인 데모 호환).
- WS `joined` 이벤트는 **방 전체에 브로드캐스트**한다 — 의료진 대기 화면이 환자 입장을
  감지하는 신호. 이벤트 스키마는 그대로라 프로토콜 변경이 아니다.
- 봇: 기존 로직 유지 — **staff가 실재하는 방에서는 봇이 침묵**해야 한다(회귀 테스트 대상).
  이미 예약된 응답 타이머도 발화 직전에 staff 존재를 다시 확인한다.

### 공유 타입 (`packages/realtime`)

- `roomSchema = z.object({ roomId, inviteCode })` 추가. HTTP 응답도 zod로 파싱해
  "파싱은 realtime에서만" 규칙 유지 — `@thegame/realtime/http`의 `decodeRoom`을 쓴다
  (ADR-0005). 비 2xx 응답 본문은 공통 `apiErrorSchema = { error, message? }`.

### 클라이언트 (`apps/live-demo`)

- `useConversation(roomId, role, lang)`으로 시그니처 변경 — 방 생성/코드 해석은 화면 단 책임.
- `conversationStore`에 `roomId · inviteCode · myRole` 보관, 나가기 시 reset.
- 의료진 흐름: "새 대화 시작" → `POST /api/rooms` → 대기 화면에 **초대 코드 + QR**
  (QR 내용은 S03의 `/room/:code` URL) → 환자 입장 이벤트 시 대화 화면 전환.
- 환자 흐름: 코드 입력(또는 QR 진입) → `GET /api/rooms/:code` → join.
  404면 "코드를 확인해 주세요" 인라인 에러(무음 실패 금지 규칙).

## 완성 기준

1. 브라우저 2탭(또는 폰 2대)에서 의료진↔환자가 초대 코드로 같은 방에 들어가 실대화가 된다.
2. staff가 있는 방에서 봇이 응답하지 않는다. staff가 없으면 기존 봇 시나리오가 동작한다.
3. 잘못된 코드 입력 시 명확한 에러가 보이고 재시도할 수 있다.
4. 기존 1인(봇) 데모도 여전히 가능하다 — 환자가 방을 직접 만들면 봇이 응대.

## 테스트

- 유닛(mock-server): 초대 코드 생성 — 6자리·혼동 문자(`0/O/1/I`) 제외·중복 회피,
  24시간 미활동 방 정리.
- 유닛(realtime): `roomSchema` 파싱 성공/실패 케이스.
- 통합(mock-server, WS 클라이언트 2개 시뮬): staff+patient 동시 join → `say`가 상대에게
  번역 병기로 브로드캐스트, **staff 실존 방에서 봇 무응답**, 잘못된 코드 조회 404.
- 수동: 브라우저 2탭 실대화 시나리오 — 완성 기준 1–4를 체크리스트로 재현.

## 작업 분해

1. 서버: rooms 저장소 + 코드 발급/해석 엔드포인트 + 정리 타이머
2. realtime: roomSchema + 테스트
3. 클라: useConversation 시그니처 변경, store 확장
4. 의료진 대기 화면(코드/QR), 환자 코드 입력 UI
5. 봇 침묵 회귀 테스트

## 범위 제외

인증·권한, 방 목록/관리 화면, 대화 기록 영속화, 3인 이상 방.
