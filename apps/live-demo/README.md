# @thegame/live-demo

Symposia(학회 자막)·CareTalk(병원 대화 통역) 라이브 데모.
**Expo React Native + react-native-web** — 같은 코드가 웹 URL과 네이티브 앱으로 동작한다 (ADR-0002).

```bash
pnpm --filter @thegame/mock-server dev   # 백엔드 목 (포트 4010) 먼저
pnpm --filter @thegame/live-demo web     # 웹에서 실행
pnpm --filter @thegame/live-demo dev     # Expo Go (QR)로 네이티브 실행
```

Android 에뮬레이터는 호스트를 `10.0.2.2`로 자동 접근하며,
실기기는 `EXPO_PUBLIC_API_URL=http://<PC IP>:4010`로 지정한다.

## 구조 포인트

- **상태**: Zustand (`stores/`) — SSE/WS 이벤트를 discriminated union 그대로 받아
  리듀서식으로 반영. 데이터 패칭은 TanStack Query (`/api/sessions`).
- **실시간**: `@thegame/realtime`의 `CaptionStream`/`ConversationSocket` 사용.
  RN에는 EventSource가 없어 `adapters/eventSource.ts`에서 react-native-sse를
  주입한다 — 웹은 기본 팩토리(브라우저 EventSource).
- **Symposia 화면**: 부분 자막 실시간 교체(▌ 커서) → 확정 시 번역 병기,
  자동 스크롤(수동 스크롤 시 일시정지 + 재개 버튼), 폰트 크기 조절(A−/A＋),
  연결 상태 배지, 재시도 흐름. 서버를 껐다 켜면 Last-Event-ID 복구를 볼 수 있다.
  **스테이지 모드**(S04): 어두운 강연장용 — 강제 다크 + 최신 확정 1건·진행 중
  부분 자막만 대형 표시 + `expo-keep-awake`. 히스토리 리스트는 언마운트하지 않고
  덮기만 해서 토글 왕복 시 스크롤·데이터가 보존된다.
- **CareTalk 화면**: 환자(EN) ↔ 의료진(KO, 봇 대행) 채팅 — 말풍선에 원문+번역,
  typing 인디케이터, 연결 끊김 중 입력은 전송 큐에 쌓였다가 재연결 시 flush.
- **디자인**: `@thegame/tokens` 원값을 RN StyleSheet로 소비 (`theme/`).
  light/dark는 테마 컨텍스트(`useTheme`/`useThemedStyles`)로 전환하며
  기본값은 OS 설정(`useColorScheme`), 스테이지 모드는 강제 다크다.
  UI 문자열은 `@thegame/i18n` (헤더에서 ko/en 전환).
- **내비게이션**: 화면 3개뿐이라 라우팅 라이브러리 없이 Zustand 라우트 스토어로
  처리 (`navigation.ts`) — 의존성 최소화를 위한 의도적 선택.

## 환경변수

| 변수 | 기본값 | 용도 |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `http://localhost:4010` (Android 에뮬레이터는 `10.0.2.2`) | 목 서버 주소. WS 주소(`WS_BASE`)는 여기서 유도한다 — `https://` → `wss://` |
| `EXPO_PUBLIC_APP_URL` | 웹은 주소창 origin, 그 외 `http://localhost:8081` | CareTalk **QR·초대 링크가 가리킬 도메인**. 네이티브에는 origin이 없어 이 값이 없으면 환자 폰이 못 여는 링크가 나온다 |

> **`process.env.EXPO_PUBLIC_X`는 점 접근으로만 치환된다.** 대괄호 접근
> (`process.env['EXPO_PUBLIC_X']`)은 번들에서 통째로 사라져 `undefined`로 접히고,
> 배포본이 조용히 localhost를 가리킨다. `src/config.ts`의 그 두 줄 형태를 바꾸지 마라
> (S07에서 실제로 물린 자리 — `src/__tests__/config.test.ts`가 유도 로직을 지킨다).

> **Metro 캐시는 환경변수 변경을 무효화하지 않는다.** 값만 바꿔 다시 export 하면 예전 값이
> 박힌 번들이 나온다. 로컬에서 값을 바꿔 확인할 때는 `--clear`를 붙여라
> (`pnpm --filter @thegame/live-demo build:deploy`가 그 버전이다).

## 배포 (Vercel 정적)

`expo export --platform web` 산출물(`dist/`)을 Vercel에 정적으로 올린다.
설정은 `vercel.json`에 있고, 클릭 순서는
[S07 배포 절차](../../docs/specs/S07-deployment.md#배포-절차-재현-가능--이-순서대로).

| 항목 | 값 |
|---|---|
| Root Directory | `apps/live-demo` (모노레포 밖 파일 포함 옵션은 켜 둔다) |
| Framework Preset | Other |
| 설치 | `pnpm install --frozen-lockfile` |
| 빌드 | `pnpm --filter @thegame/live-demo build:deploy` (= `expo export --platform web --clear`) |
| 출력 | `dist` |

**SPA rewrite가 필수다.** 산출물은 `index.html` 하나뿐이라, 리라이트가 없으면
`/room/:code`·`/console`·`/admin`·`/session/:id` 직접 진입이 404가 난다(S03).
`vercel.json`의 `rewrites`가 "파일이 없으면 `/index.html`"을 담당한다.

같은 규칙을 로컬에서 재현해 확인할 수 있다:

```bash
pnpm --filter @thegame/live-demo build
node apps/live-demo/scripts/serve-web.mjs apps/live-demo/dist 8081
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8081/room/ABC123   # 200이어야 한다
```
