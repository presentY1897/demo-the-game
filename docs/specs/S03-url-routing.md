# S03. URL 라우팅·딥링크·재접속 복귀

- **갈래**: 구조 · **의존**: S01, S02 · **판정**: 대기

## 배경 (진단 근거)

라우트가 Zustand 메모리(`navigation.ts`)에만 있어, 웹에서 새로고침하면 홈으로 튕기고
특정 세션/방을 링크로 공유할 수 없다. QR 입장(S01)과 "링크 클릭만으로 보는 데모"
(ADR-0002)의 전제가 이것 때문에 막혀 있다.

## 명세

### 웹 URL 동기화

- 라우트 스토어 ↔ History API 양방향 동기화 (웹 전용 어댑터, `Platform.OS === 'web'` 분기):
  - `/` → home, `/session/:id` → symposia, `/room/:code` → caretalk
  - `navigate()` 시 `pushState`, `back()`/브라우저 뒤로가기 → `popstate` 반영.
- 초기 로드 시 URL 파싱해 해당 화면으로 직행:
  - `/room/:code` 진입 → 역할은 환자로 가정(초대 링크는 환자용) → 언어 온보딩(S02) 경유 후 join.
  - `/session/:id` 진입 → 자막 화면 직행.
- 라우팅 라이브러리는 도입하지 않는다 — 화면 3~4개 규모에서 기존 스토어 + 어댑터로
  충분(의존성 최소화 원칙 유지). 화면이 늘면 그때 expo-router 도입을 별도 ADR로.

### QR

- 의료진 대기 화면(S01)의 QR = `{배포 도메인}/room/{code}`.
- QR 생성은 로컬 라이브러리(예: react-native-qrcode-svg) — 외부 API 사용 금지.

### 네이티브 딥링크 (2차)

- `expo-linking` 스킴(`thegame://room/:code`)은 웹 URL 안정화 후 별도 커밋. 데모 시연은
  웹 URL + Expo Go로 충분.

### 재접속 복귀

- 마지막 라우트·역할·언어를 localStorage(웹)/AsyncStorage(네이티브)에 저장.
- 앱 재시작 시 **자동 이동은 하지 않고**, 홈 상단에 "이어서: OO 세션/방으로 돌아가기"
  배너로 제안 — 강제 복귀는 다른 세션을 보려는 사용자를 방해한다.

## 완성 기준

1. 자막/대화 화면에서 새로고침해도 같은 화면이 유지된다.
2. `/room/:code` 링크를 다른 브라우저에 붙여넣으면 온보딩을 거쳐 그 방에 입장한다.
3. 브라우저 뒤로가기가 앱 내 back과 일치한다.
4. 재시작 시 "이어서" 배너가 뜨고, 탭하면 이전 방/세션으로 간다.

## 테스트

- 유닛: URL ↔ 라우트 변환 왕복(parse/serialize) — `/`, `/session/:id`, `/room/:code`,
  `/console`, `/admin`, 미지 경로 → home.
- 유닛: 복귀 저장/로드 — storage 예외 시 조용히 무시하되 앱 동작 정상(try/catch 경로).
- 통합(웹): pushState/popstate 시뮬 — navigate → URL 갱신, 뒤로가기 → 라우트 복원.
- 수동: 새로고침 유지, 다른 브라우저에서 `/room/:code` 링크 입장, "이어서" 배너 시나리오.

## 작업 분해

1. 웹 URL 어댑터 (파싱 + pushState/popstate)
2. 초기 로드 딥링크 진입 흐름 (온보딩 컨텍스트 유지)
3. QR 생성 컴포넌트
4. 재접속 복귀 저장/배너
5. 네이티브 스킴 (2차)

## 범위 제외

SSR/SEO(라이브 데모는 앱 — product가 담당), 라우팅 라이브러리 도입, 웹 외 플랫폼의 URL 복원.

## 구현 메모 (2026-09-01)

- **지원 경로**: `/` · `/session/:id` · `/room` · `/room/:code` · `/console` · `/admin`,
  그 외 전부 home. 명세에 없던 `/room`(코드 없는 CareTalk 진입)이 늘었다 — 역할·언어
  온보딩 단계에도 주소가 있어야 새로고침이 홈으로 튕기지 않는다.
- **어댑터는 `window`가 아니라 포트를 받는다** (`connectHistory(env)`). `history`·
  `location.pathname`·`popstate` 등록/해제만 요구해서, 테스트가 가짜 히스토리 스택으로
  pushState/popstate 왕복을 그대로 재현한다(라이브러리·jsdom 없이).
- **`navigate` = push, `replace` = 주소만 교체.** 라우트 스토어에 `mode` 필드를 둬
  어댑터가 둘을 구분한다. popstate 반영은 `replace`로 들어와 다시 push되는 순환이 없다.
- **back은 전략 주입.** 웹 어댑터가 `setBackStrategy`로 `history.back()`을 꽂아 앱 내
  back과 브라우저 뒤로가기를 한 동작으로 만든다. 앱이 쌓은 히스토리 칸이 0이면
  (초대 링크로 바로 들어온 첫 화면) 앱 밖으로 나가지 않고 홈으로 보낸다.
- **복귀 저장 형식은 JSON이 아니라 `v1|<path>|<role>|<lang>` 한 줄.** 라우트 직렬화를
  URL 어댑터가 이미 하고 있어 재사용되고, 스키마 없는 JSON을 되읽는 자리를 만들지 않는다
  (CLAUDE.md: 파싱은 realtime에서만). 알 수 없는 형식은 `null`로 버린다.
- **storage 실패는 삼키되 조용하지는 않다.** 사파리 프라이빗 모드처럼 `setItem`이 던지는
  환경에서 복귀 배너만 비활성되고 앱은 그대로 동작한다 — 다만 `console.warn`은 남긴다
  (무음 실패 금지). 저장소 자체가 없는 플랫폼은 `platformStorage()`가 `null`을 준다.
- **`/room/:code` 진입 시 역할은 환자가 기본이지만, 같은 코드를 보던 기기면 저장된 역할을
  되살린다.** 의료진이 새로고침했다고 환자로 바뀌면 안 된다. 다른 브라우저에는 저장값이
  없으므로 명세대로 환자 온보딩을 탄다.
- **정적 호스팅에는 SPA 폴백이 필요하다.** `expo export --platform web` 산출물은
  `index.html` 하나라, `/room/:code` 직접 진입이 404가 나지 않으려면 호스트에
  "모든 경로 → index.html" 리라이트가 있어야 한다(S07 배포 시 반영 대상).

### 미완 — 네이티브 딥링크 (명세의 2차)

`expo-linking` 스킴(`thegame://room/:code`)과 AsyncStorage 복귀는 붙이지 않았다.
`platformStorage()`가 네이티브에서 `null`을 돌려주고(복귀 배너만 비활성), 라우트는
메모리에만 산다. 확장 지점은 `src/storage/platform.ts` 한 파일과 `App.tsx`의
`useUrlSync()` 분기 두 곳이다.
