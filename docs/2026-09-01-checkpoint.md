# 중간 점검 — 기능 스펙과 남은 작업 (2026-09-01)

> **이 문서는 2026-09-01 점검 시점의 기록이다.** 이후 F01·F02와 S01–S14를 전부
> 승인받아 실행했고, §1의 현황 보드와 §7의 진단은 **더 이상 현재 상태가 아니다**.
> 실행 결과는 문서 맨 아래 [§10 실행 결과](#10-실행-결과-2026-09-01-마감)에, 명세별 판정은
> [docs/specs/README.md](./specs/README.md)에 있다. 본문은 이력으로 보존한다.

더게임 프론트엔드 지원용 데모 프로젝트의 검토 문서.
구현된 기능의 상세 스펙(백엔드 API 계약 · 메시지 프로토콜 · 프론트 페이지/화면 구성)과
앞으로 개발할 것의 스펙을 정리한다. v5에서 개별 작업 명세를 분리했고, v6에서
**사용자 집단 기반 기능 명세(F01 학회: 간사/발표자/참가자, F02 병원: 관리자/의사/환자)를
최상위에 두고** 작업 명세를 그 아래로 재정렬했다([docs/specs/](./specs/README.md)).
전 작업 명세에 완성 기준·테스트 섹션 포함. 호스팅은 Render 무료로 채택(질문 B 해결),
번역은 Azure Translator F0 연동을 S12로 제안. 미결은 명세 검토(질문 E)다.

- 기준일: 2026-09-01 · 커밋 7개 (8/31) · 브랜치 `main` 클린
- ADR 4건 · perf 로그 0건

## 1. 전체 현황 보드

코드 작업은 계획의 대부분이 끝났지만, corporate 앱 · perf 기록 · 배포/CI가 비어 있고
**사용자 시나리오 기반 UX 설계**가 빠져 있다.

| 워크스페이스 | 상태 | 내용 |
|---|---|---|
| `apps/mock-server` | ✅ 완료 | SSE 자막 브로드캐스트 + WS 대화 통역 백엔드 → §3 |
| `apps/live-demo` | ✅ 완료 | Expo RN + react-native-web 실시간 데모, 화면 3개 → §4 |
| `apps/product` | ✅ 완료 | Next.js 15 제품 홈페이지, ko/en → §5 |
| `packages/*` 5종 | ✅ 완료 | tokens · i18n · realtime · ui · config → §6 (단, config에 eslint 없음) |
| 제품 구조 (실사용 여정) | ⬜ 없음 | 앱이 시연 프레임 — 랜덤 방·역할 고정·URL 라우팅 부재로 실사용 불가 → 진단 §7 |
| UI/UX 설계 | ⚠ 부분 | 연결/복구 등 시스템 신뢰성 UX만 존재 — 사용자·맥락 기반 설계 없음 → 진단 §7, 질문 E |
| `apps/corporate` | ✅ 결정 | 만들지 않기로 확정(9/1, 질문 A) — product에 회사 소개 섹션 + README 정리로 대체 |
| 배포 · CI | ⬜ 없음 | 어떤 앱도 배포 안 됨, GitHub Actions 없음 → §8, 질문 B |
| `docs/perf` | ⬜ 0건 | "측정→분석→개선" 기록 아직 없음 → §8, 질문 C |

## 2. 시스템 구성

가상 제품 두 개를 하나의 데모 시스템으로 묶었다.
**Symposia**(학회 실시간 자막: 서버 → 다수 참석자, 단방향)와
**CareTalk**(병원 의료진↔환자 통역: 양방향).

- **데이터 흐름** — live-demo 앱이 mock-server에 연결: 자막은 SSE, 대화는 WebSocket
  (ADR-0003 — 단방향 브로드캐스트엔 SSE의 내장 재연결·유실 복구가, 양방향 1:1엔 WS가 구조적으로 맞음).
- **계약의 단일 원천** — 모든 실시간 메시지 타입은 `packages/realtime`의 zod discriminated
  union으로만 정의하고, 서버(직렬화)와 클라이언트(파싱)가 같은 스키마를 공유한다.
  계약 불일치가 타입 레벨에서 차단된다.
- **디자인의 단일 원천** — `packages/tokens`를 웹(CSS 변수)과 RN(StyleSheet 원값)이 함께 소비.
  UI 문자열은 `packages/i18n`(ko/en)으로만.
- **홈페이지(product)는 정적 소개** — 실시간 연결 없이 자막/채팅을 연출로 재현하고,
  라이브 데모 URL로 보낸다.

## 3. 백엔드 스펙 — mock-server

실제 STT/번역 백엔드 자리를 대신하는 목 서버. 강연 스크립트를 실시간처럼 재생하며,
실서비스로 교체돼도 클라이언트가 그대로 동작하도록 프로토콜을 실제와 같은 형태로 설계했다.

### 3.1 Symposia — 학회 자막 스트리밍 (HTTP + SSE)

| 엔드포인트 | 동작 |
|---|---|
| `GET /health` | 헬스 체크 `{ ok: true }` |
| `GET /api/sessions` | 세션 메타 목록 — `id · title · speaker · sourceLang · targetLangs` |
| `GET /api/sessions/:id/stream` | SSE 스트림. 쿼리 `?lang=en`(원문+선택 언어만 수신, 생략 시 전체), `?lastEventId=` 또는 `Last-Event-ID` 헤더로 재연결 복구. 미지의 세션이면 404 |

- **공유 브로드캐스트** — 서버 기동 시 세션별 재생을 시작하고, 모든 시청자가 같은 시점을 본다 (실제 학회처럼).
- **STT→번역 파이프라인 시뮬레이션** — 부분 자막(단어 단위 진행, `isFinal: false`, 같은 `id`의
  후속 이벤트로 교체) → 원문 확정 → 400ms 지연 후 언어별 번역 확정 순서로 흐른다.
- **유실 복구** — 확정 이벤트에만 SSE `id:`를 부여. 재연결 시 놓친 확정 자막만 다시 내려주고,
  부분 자막은 휘발성으로 취급해 복구하지 않는다.
- **연결 유지** — 15초 간격 heartbeat, CORS 전체 허용(데모 편의).

### 3.2 CareTalk — 병원 대화 통역 (`WS /ws/conversation`)

| 클라이언트 → 서버 | 서버 → 클라이언트 |
|---|---|
| `join { roomId, role, lang }` | `joined { roomId, role }` |
| `say { text }` | `message { id, role, lang, text, translation{lang,text}, ts }` — 방 전체에 번역 병기 브로드캐스트 |
| `typing` | `typing { role }` — 상대에게 입력 중 표시 |
| 스키마 위반 payload | `error { code, message }` — 무음 실패 없음 |

- **역할 모델** — `staff`(의료진, KO) / `patient`(환자, EN). 커맨드는 `clientCommandSchema`로 검증.
- **봇 의료진 대행** — staff가 없는 방에서는 봇이 의료진 역할을 수행: typing 인디케이터를
  보여준 뒤 진료 시나리오 순서(접수→증상 문진→안내)대로 응답한다. 1인 시연을 위한 설계.
- **번역** — 데모용: 자주 쓰는 진료 문구 사전 매칭 + 미등록 문장은 `[demo]` 마커 폴백
  (`src/translate.ts`). 실서비스에서 번역 API로 교체되는 자리.

### 3.3 메시지 프로토콜 (`packages/realtime/src/types.ts`)

모든 이벤트는 `type` 필드 기준 discriminated union이며, 이 파일이 유일한 정의처다.

- **CaptionEvent** (SSE) — `session`(세션 메타) · `caption`(`id·seq·lang·text·isFinal`) ·
  `session-ended` · `heartbeat`
- **ConversationEvent** (WS 수신) — `joined` · `message` · `typing` · `error`
- **ClientCommand** (WS 송신) — `join` · `say` · `typing`
- 파싱은 `parseCaptionEvent / parseConversationEvent`로만 — 실패 시 throw 대신
  `{ ok: false, error: RealtimeError }`를 반환해 호출부가 에러를 구분 처리한다.

## 4. 프론트 스펙 — live-demo (핵심 데모)

Expo React Native + react-native-web — 같은 코드가 웹 URL과 Expo Go 네이티브로 동작한다
(ADR-0002, "리뷰어는 브라우저로, 면접장에선 실기기로"). 화면은 3개, 라우팅 라이브러리 없이
Zustand 라우트 스토어로 전환한다.

### 화면 1 · Home — 세션 로비

- 회사/제품 소개 + 헤더에서 **ko/en 언어 전환**.
- TanStack Query로 `/api/sessions` 조회 — 로딩 인디케이터, 실패 시 에러 박스 +
  **재시도 버튼**(retry 1회 자동).
- 세션 목록: LIVE 도트 · 제목 · 발표자 · 언어쌍(`KO → EN, JA…`) 표시, 탭하면 Symposia 화면으로.
- CareTalk 진입 카드 → 대화 통역 화면으로.

### 화면 2 · Symposia — 학회 실시간 자막

- **부분 자막 실시간 교체** — 진행 중 문장은 ▌ 커서와 함께 단어 단위로 갱신되고,
  확정되면 번역이 병기된 확정 자막으로 바뀐다.
- **자동 스크롤 제어** — 새 자막마다 하단 고정, 사용자가 위로 스크롤하면 자동 스크롤
  일시정지 + "재개" 버튼 노출 (지난 자막을 읽는 UX 보호).
- **가독성** — A− / A＋ 폰트 크기 조절 (강연장 뒷좌석 시나리오).
- **연결 상태 배지** — connecting / open / reconnecting / error를 색·라벨로 표시, 실패 시 재시도 흐름.
- **재연결 복구 시연** — 서버를 껐다 켜면 지수 backoff 재연결 + `Last-Event-ID`로 놓친
  확정 자막이 복구되는 걸 눈으로 확인 가능.

### 화면 3 · CareTalk — 병원 대화 통역

- 환자(EN) ↔ 의료진(KO, 봇 대행) 채팅 — 말풍선에 **원문 + 번역 병기**, 역할별 정렬/색.
- 상대 **typing 인디케이터**, 입력 시 내 typing 전송.
- **오프라인 내성** — 연결이 끊긴 동안의 입력은 `ConversationSocket`의 전송 큐에 쌓였다가
  재연결 직후 순서대로 flush된다.
- 연결 상태 배지 공유(Symposia와 동일 컴포넌트).

### 공통 아키텍처

- **상태** — Zustand 스토어(`captionStore` / `conversationStore`)가 SSE/WS 이벤트를
  discriminated union 그대로 받아 리듀서식으로 반영. 서버 데이터 패칭은 TanStack Query.
- **플랫폼 분기** — RN엔 네이티브 EventSource가 없어 `adapters/eventSource.ts`에서
  react-native-sse를 주입, 웹은 브라우저 기본 구현 사용 (realtime 패키지의 팩토리 주입 설계).
- **디자인/문자열** — `tokens` 원값을 `theme.ts`에서 StyleSheet로 소비, 문자열은 `i18n`만
  사용(하드코딩 금지 규칙).
- **접속 환경** — Android 에뮬레이터는 `10.0.2.2` 자동 처리, 실기기는 `EXPO_PUBLIC_API_URL`로 지정.

## 5. 프론트 스펙 — product 홈페이지

Next.js 15 (App Router) — Symposia/CareTalk를 소개하고 라이브 데모로 보내는 마케팅 사이트.
페이지는 3개, 전부 `[locale]` 세그먼트 아래에서 ko/en을 지원한다.

### `/` — 언어 감지 리다이렉트

`navigator.language`가 ko면 `/ko`, 아니면 `/en`으로 replace.
JS 실패 대비 English · 한국어 수동 링크 폴백 제공.

### `/[locale]` — 랜딩, 섹션 5개

1. **히어로** — 슬로건 + CTA 2개(라이브 데모 열기 `NEXT_PUBLIC_DEMO_URL` · 문의하기) +
   **CaptionStage**: 실제 데모의 자막 UX(부분 자막 타이핑 → 확정 → 번역 병기)를
   CSS/JS 연출로 재현한 무대.
2. **Symposia** — 기능 소개 카드 그리드 (실시간 자막·다국어·유실 복구 등).
3. **CareTalk** — 카피 + 체크리스트와 **ChatPreview**(원문+번역 말풍선 미리보기) 좌우 스플릿.
4. **도입 절차** — 01/02/03… 번호 스텝 리스트.
5. **CTA 밴드** — 문의 페이지로 유도.

### `/[locale]/contact` — 문의 폼

- 필드: 이름\* · 이메일\* · 소속 · 관심 제품(Symposia/CareTalk 다중 토글) · 메시지.
- 클라이언트 검증 — 이름 필수, 이메일 형식(정규식), 필드별 에러 메시지(i18n).
- 제출은 **데모 시뮬레이션** — 900ms 후 접수 완료 카드 표시. 실제 전송 백엔드 없음(의도된 범위).
- `generateMetadata`로 페이지별 title 설정.

### 공통

- SiteHeader(로고 · 섹션 앵커 · **언어 전환**) / SiteFooter. 문자열은 `i18n/dictionaries.ts`
  사전으로 일원화.
- 공유 `ui` 컴포넌트 소비 — `transpilePackages`로 TS 소스 직접 트랜스파일(ADR-0004).
- 잘못된 로케일은 `notFound()`.

## 6. 공유 패키지 스펙

| 패키지 | 제공하는 것 |
|---|---|
| `@thegame/realtime` | **CaptionStream**(SSE 구독, EventSource 팩토리 주입) · **ConversationSocket**(WS, 자동 재연결 + 지수 backoff, 오프라인 전송 큐) · `ConnectionState` 상태 모델 · `RealtimeError` 에러 코드 체계 · §3의 zod 스키마. vitest 테스트 3파일(backoff/sse/types) |
| `@thegame/ui` | 웹 디자인 시스템 — Button · ButtonLink · Badge · Card · Heading/Text · TextField (+ `cx` 유틸). Storybook 스토리 및 토큰 문서 페이지 포함 |
| `@thegame/tokens` | 팔레트(teal/coral/neutral) + 라이트/다크 시맨틱 컬러 · 타이포 · 스페이싱 · CSS 변수 생성기. 웹과 RN이 공유 |
| `@thegame/i18n` | ko/en 리소스 + translator 유틸 — 모든 앱의 UI 문자열 단일 소스 |
| `@thegame/config` | 공유 tsconfig(base/react). **eslint 프리셋은 미구현** → §8 |

전 패키지가 빌드 산출물 없이 TS 소스로 직접 배포되고(ADR-0004), 소비 앱(Next/Metro)이
트랜스파일을 담당한다.

## 7. 제품 구조·UX 진단

문제는 두 겹이다. **구조** — 앱이 실제 사용 가능한 제품이 아니라 기능 시연 모음으로
짜여 있고, **UX** — 있는 기능조차 사용자·맥락 기반 설계 없이 기술 요구에서 역산돼 있다.
아래 진단은 실코드 확인 기준.

### 구조 진단 — 실사용이 구조적으로 불가능한 지점

- **진입이 데모 로비** — 첫 화면이 회사 소개 + 기능 목록. 실제 사용자 여정(참석자가
  코드/QR로 세션 입장, 환자가 초대 코드로 방 입장)이 아니라 "구경 오세요" 동선이다.
- **CareTalk은 2인 대화가 불가능** — `useConversation.ts`가 마운트마다 랜덤 방(`demo-xxxx`)을
  새로 만들고, 역할·언어가 `('patient', 'en')`으로 하드코딩. 의료진과 환자가 같은 방에
  들어갈 방법 자체가 없다. 정작 서버(`conversation.ts`)는 임의 방 join과 다인 브로드캐스트를
  이미 지원하는데, 클라이언트가 그 능력을 봉인하고 봇 시연으로만 쓴다.
- **URL 라우팅 부재** — 라우트가 메모리(Zustand)에만 있어 웹에서 새로고침하면 홈으로
  튕기고, 특정 세션/방을 링크로 공유할 수 없다.
- **세션 입장 개념 없음** — Symposia는 서버가 항상 틀어주는 목 세션을 로비에서 탭해 보는
  구조. 입장 코드/QR, 세션 시작·종료 같은 라이프사이클이 없다.

요약: **서버는 제품 구조인데 앱은 쇼케이스 구조**다. 재편 작업의 대부분은 클라이언트
동선이고, 서버는 방 코드 발급 정도만 추가하면 된다.

### 있는 것 — 시스템 실패에 대한 UX

- 연결 상태 배지 · 재시도 흐름 · 재연결 자막 복구 · 오프라인 전송 큐 — 전부 "네트워크가
  흔들릴 때"의 UX.
- 자동 스크롤 일시정지/재개, A−/A＋ 폰트 조절, 자막 언어 선택 칩, typing 인디케이터,
  로딩/에러/빈 상태 일부.
- 접근성 속성(`accessibilityRole` 등) 13곳 — 산발적 적용, 기준 없음.

즉, 개별 장치는 있지만 사용자 시나리오가 아니라 기술 요구사항(JD의 SSE/WS·재연결)에서
역산된 것들이다.

### 빠진 것 — 사용자·맥락에서 출발한 설계

- **사용자 정의 자체가 없음** — 두 제품의 사용자(학회 참석자 / 외국인 환자·의료진)와
  사용 맥락이 어떤 문서·코드에도 정의돼 있지 않다.
- **Symposia: 어두운 강연장에서 폰으로 장시간 본다**는 맥락 미반영 — 다크 모드 없음
  (`theme.ts`가 `semanticColor.light` 고정, tokens의 다크 세트는 미사용), 화면 꺼짐
  방지(keep-awake) 없음, 세션 직행 딥링크/QR 동선 없음(로비 경유 강제).
- **CareTalk: 불안한 외국인 환자**라는 맥락 미반영 — 자유 텍스트 입력뿐(자주 쓰는 문구
  빠른 선택 없음), 역할·언어 선택 온보딩 없음(데모 하드코딩), 터치 타깃·최소 글자 기준 없음.
- **횡단 기준 부재** — 접근성 기준(대비 AA, 라벨 전수, OS 폰트 스케일 대응) 없음,
  빈/에러/오프라인 상태 매트릭스 점검 없음, 모션·전환 등 시각 완성도 기준 없음,
  product의 전환(conversion) 관점 검증 없음.

### UX 보완 스펙 — 재편된 구조(§8 P1) 위에 얹는 것들, 범위는 질문 E

- **사용자 시나리오 문서화** — 참석자/환자/의료진 3인의 맥락·목표를 1페이지로 정의하고,
  이후 모든 UX 결정의 근거로 사용 (ADR처럼).
- **Symposia 스테이지 모드** — 다크 테마(tokens 다크 세트 활용) + 최신 자막 대형 표시 +
  keep-awake. "강연장 뒷좌석" 시나리오의 완결.
- **CareTalk 환자 UX** — 자주 쓰는 문구 quick reply(번역 사전과 연동) · 역할/언어 선택
  온보딩 · 터치 타깃 44pt와 최소 글자 기준.
- **접근성 패스** — 토큰 대비 검사(AA), accessibility 라벨 전수 적용, OS 폰트 스케일 대응.
- **상태 매트릭스 점검** — 화면 × (빈/로딩/에러/오프라인) 전수 확인, 비주얼 폴리시
  (등장·전환 모션 절제 규칙).

## 8. 개발 예정 — 기능 명세와 작업 명세

**[docs/specs/](./specs/README.md)** 를 두 층위로 관리한다:

- **기능 명세 (F)** — 사용자 집단 정의가 최상위. [F01 Symposia](./specs/F01-symposia-roles.md)
  (간사 · 발표자 · 참가자), [F02 CareTalk](./specs/F02-caretalk-roles.md)(병원 내 관리자 ·
  의사 · 환자) — 역할별 기능 표와 데모 구현 범위(✅/❌)를 담는다.
- **작업 명세 (S)** — F의 기능을 구현 단위로 분해. 전 명세가 **배경 → 명세 → 완성 기준 →
  테스트(자동/수동) → 작업 분해 → 범위 제외**를 담는다. **명세가 정본**이고 이 표는 인덱스다.

| ID | 명세 | 갈래 | 의존 |
|---|---|---|---|
| [S01](./specs/S01-room-lifecycle.md) | 방 라이프사이클과 초대 코드 (2기기 실대화) | 구조 | — |
| [S02](./specs/S02-entry-onboarding.md) | 역할 기반 진입 동선과 온보딩 | 구조 | S01, S14 |
| [S03](./specs/S03-url-routing.md) | URL 라우팅·딥링크·재접속 복귀 | 구조 | S01, S02 |
| [S04](./specs/S04-stage-mode.md) | Symposia 스테이지 모드 | UX | — |
| [S05](./specs/S05-quick-reply.md) | CareTalk 퀵 리플라이 | UX | S01, S02 |
| [S06](./specs/S06-accessibility.md) | 접근성 패스 | UX | S02 권장 |
| [S07](./specs/S07-deployment.md) | 배포 파이프라인 (Render + Vercel) | 인프라 | S01–S03 권장 |
| [S08](./specs/S08-perf-caption-rerender.md) | perf: 자막 리렌더 측정·개선 | 성능 | S01–S04 |
| [S09](./specs/S09-perf-lighthouse.md) | perf: product Lighthouse | 성능 | — |
| [S10](./specs/S10-quality-infra.md) | 품질 인프라 (eslint·CI·테스트) | 인프라 | — |
| [S11](./specs/S11-docs-corporate.md) | corporate 접기 반영·문서 정리 | 문서 | S07 일부 |
| [S12](./specs/S12-translation-api.md) | 번역 API 연동 (Azure Translator F0) | 기능 | — |
| [S13](./specs/S13-symposia-console.md) | Symposia 운영 콘솔 (간사·발표자) | 구조 | S01–S03, F01 |
| [S14](./specs/S14-caretalk-admin.md) | CareTalk 관리자 뷰 | 구조 | S01, F02 |

제안 순서: **S01→S02→S03(구조) → S13·S14(운영·관리자 역할) → S04·S05·S06(UX) →
S12(번역) → S07(배포) → S08·S09(성능)**. S10은 병행 가능, S11은 마지막.

## 9. 피드백 요청

- **A. corporate 앱** — ✅ 해결(9/1): 만들지 않는다. product에 회사 소개 + SEO로 대체 → S11.
- **B. 배포 호스팅** — ✅ 해결(9/1): **Render 무료 채택**. 조건 검토 결과 문제 없음 —
  WS/SSE 상시 프로세스 지원, 카드 불필요. 제약은 15분 유휴 후 슬립(콜드스타트 수십 초,
  수용). 근거·대안 비교 → S07.
- **C. perf 항목** — ✅ 해결(9/1): 성능 축이 달라(S08=라이브 데모 런타임 렌더링,
  S09=product 초기 로딩) 충돌이 없으므로 **둘 다** 수행.
- **D. 마감 시점** — ✅ 해결(9/1): 마감 기준 역산은 하지 않는다. 전 작업을 명세화했고
  진행/보류는 리뷰가 명세별로 판단한다.
- **E. 명세 검토** — [F01·F02와 S01–S14](./specs/README.md) 각각에 대해
  진행 / 보류 / 수정 판단 요청. 특히 신규 제안 확인: S12 번역 API(Azure Translator F0 —
  키는 선택 사항, 없으면 현행 동작), S13 운영 콘솔, S14 관리자 뷰.

---

근거 자료: 실코드(`apps/*/src`, `packages/*/src`) · `README.md` · `CLAUDE.md` ·
`docs/adr/0001–0004` · git 로그 7개 커밋 (2026-08-31). 스펙 서술은 요약이 아니라 소스 확인
기준 — 예: 전송 큐는 `packages/realtime/src/ws.ts`, 폼 검증은 `ContactForm.tsx`.

---

## 10. 실행 결과 (2026-09-01 마감)

질문 E가 **"F01·F02와 S01–S14 전부 승인, 명세를 그대로 계약으로"** 로 확정돼 전 작업을
실행했다. 커밋 59개. 명세별 판정과 커밋 해시는 [docs/specs/README.md](./specs/README.md).

### 무엇이 달라졌나

| §1 보드의 항목 | 점검 시점 | 마감 시점 |
|---|---|---|
| 제품 구조 (실사용 여정) | ⬜ 없음 | ✅ 코드/QR 입장·역할 진입·URL 딥링크·재접속 복귀 (S01–S03) |
| UI/UX 설계 | ⚠ 시스템 신뢰성만 | ✅ 스테이지 모드·퀵 리플라이·접근성 패스 (S04·S05·S06) |
| 운영·관리자 여정 | ⬜ 없음 | ✅ 운영 콘솔·관리자 뷰 (S13·S14) |
| 배포 · CI | ⬜ 없음 | CI ✅ · 배포는 설정·절차까지 (S10·S07) |
| `docs/perf` | ⬜ 0건 | ✅ 2건 (001 자막 리렌더 · 002 product Lighthouse) |
| `packages/config` eslint | ⬜ 미구현 | ✅ 프리셋 3종 + 프로젝트 커스텀 규칙 2종 (S10) |

### 측정으로 남은 것 (수치 없는 개선 주장 금지 규칙)

| 항목 | before | after | 근거 |
|---|---|---|---|
| 자막 부분 갱신 1회당 리렌더 컴포넌트 | 279.9개 (p95 611) | **6.0개** | [perf/001](./perf/001-자막-리렌더.md) |
| 자막 줄 수에 대한 비용 기울기 | 약 11 | **0.0** | 같은 문서 |
| product `/ko` FCP · CLS | 1.54s · 0.028 | **0.90s · 0.001** | [perf/002](./perf/002-product-lighthouse.md) |
| 브랜드 서체 전송량 | 390KB / 15요청(외부) | **81KB / 1요청(동일 출처)** | perf/002 3차 |
| product axe-core 위반 | 66건 | **0건** | S06 구현 메모 |
| live-demo axe-core 위반 (라이트/다크) | 138 / 132건 | **0 / 0건** | S06 구현 메모 |
| 44pt 미만 터치 타깃 | 51개 | **0개** | S06 구현 메모 |
| 글자 2× 확대 시 잘림 | 60개 | **0개** | S06 구현 메모 |
| 배지 라벨 대비 미달 조합 | 15개 | **0개** (최악 8.87:1) | S06 구현 메모 |
| 자동 테스트 | 3파일 | **38파일 542건** | — |
| ADR | 4건 | **10건** | [adr/](./adr/README.md) |

### 실행 중 발견해 고친 결함

명세에 없던 것들이다. 대부분 **검증을 실제로 돌렸기 때문에** 드러났다.

- **배포 빌드에 환경변수가 들어가지 않았다** — `config.ts`가 `process.env['EXPO_PUBLIC_API_URL']`
  처럼 대괄호로 읽었는데 Expo의 빌드 시점 치환은 점 접근에만 동작한다. 번들에서 통째로 사라져
  폴백만 남았다. 그대로 배포했으면 **리뷰어의 브라우저가 자기 localhost에 붙으려다 조용히 실패**했다. (`a62b915`)
- **`hitSlop`은 react-native-web에서 무시된다** — 터치 타깃을 hitSlop으로 채운 자리가 웹에서는
  전부 규격 미달이었다. 상자 크기로 고쳤다. (`38af8a3`)
- **의료진이 새로고침하면 초대 코드가 바뀌었다** — 방을 새로 만들고 있었다. (`14a992e`)
- **새로고침한 쪽이 상대의 `joined`를 놓쳐 대기 화면에 갇혔다** — 상대의 `message`·`typing`도
  존재 증거로 처리. (`14a992e`)
- **turbo가 product의 `build`와 `test`를 같은 디렉토리에서 동시에 돌렸다** — `next build`가 두 번
  실행돼 산출물을 덮어썼고 콜드런에서 typecheck가 간헐적으로 깨졌다. (`34a5951`)
- **live-demo tsconfig에 `exclude`가 없어** expo export 산출물이 tsc 프로그램에 딸려 들어갔다. (`28969a7`)
- **방을 마지막 참여자가 나갈 때 즉시 삭제**하고 있었다 — 환자가 새로고침하면 코드가 죽는다. TTL로 전환. (`c97ccfd`)
- **다크 `danger`가 2.81:1로 AA 미달**이었다. (`433cb07`) 이후 대비를 토큰 계약으로 승격해
  25조합을 고치고 테스트로 고정했다. ([ADR 0009](./adr/0009-contrast-as-token-contract.md), `4e86b09`)
- **RNW 0.21이 `accessibilityState`를 DOM으로 옮기지 않아** 웹에서 상태가 무음으로 사라졌다.
  ([ADR 0010](./adr/0010-aria-props-for-accessibility-state.md), `38af8a3`)
- **WS 수신 진입점이 직접 `JSON.parse`** 했다 — "파싱은 realtime에서만" 규칙 위반. (`8e5f7e7`)

### 통합 검증

각 작업은 자기 브랜치에서 검증했고, 전부 합친 뒤 **헤드리스 브라우저로 통합 스모크를 한 번 더**
돌렸다: 콘솔 세션 생성 → 시작 → 참가자 딥링크 자막 수신 → 새로고침 유지 → 의료진 방 생성 →
환자 링크 입장 → **2기기 실대화** → 관리자 현황 반영(대화 내용 미노출) → 미지 경로 정규화.
**10/10 통과, 콘솔 에러 0건.**

### 남은 것 — 전부 이 환경에서 불가능한 검증

1. **배포 링크 4종과 데모 GIF** (S11) — Render/Vercel 계정 연결과 첫 배포는 사용자 몫으로
   정했다(9/1). 절차는 [S07](./specs/S07-deployment.md)에 클릭 순서로 있다. URL이 나오면
   루트 README 상단과 `NEXT_PUBLIC_DEMO_URL`·`EXPO_PUBLIC_APP_URL`을 채우고 스모크 체크리스트를 돌린다.
2. **스크린리더 3여정 완주 체크리스트** (S06) — VoiceOver/TalkBack 실기기 필요. 자동 검증은
   전부 통과했고, 남은 건 "읽는 순서와 문장이 쓸 만한가"라는 사람의 판단이다.
3. **Azure 실키 스모크** (S12) — 키 필요. 키 없이 도는 경로는 테스트로 고정돼 있다.
