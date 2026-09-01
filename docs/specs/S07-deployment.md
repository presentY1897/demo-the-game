# S07. 배포 파이프라인

- **갈래**: 인프라 · **의존**: S01–S03 권장(재편된 앱을 배포) · **판정**: 대기

## 배경 (진단 근거)

ADR-0002의 전제가 "리뷰어가 링크 클릭만으로 본다"인데 아무것도 배포돼 있지 않다.
mock-server는 SSE/WS 상시 프로세스라 정적/서버리스 호스팅이 불가능하고, 비용은 무료를
원칙으로 한다(사용자 확인 9/1: 무료, Render 수준의 간단한 서비스 선호).

## 명세

### mock-server → Render 무료 (채택)

- 조건 검토 결과 **Render 무료로 충분하다**: 무료 웹 서비스가 WS·SSE 상시 프로세스를
  지원하고, 카드 등록이 필요 없어 가장 간단하다(월 750 인스턴스 시간 — 서비스 1개 상시
  가능).
- 제약: 15분 무트래픽 시 슬립 → 첫 접속 콜드스타트(수십 초). 데모 특성상 수용.
  (선택) GitHub Actions cron으로 `/health` 핑을 걸어 완화.
- 콜드스타트 부작용: 서버 재기동 시 공유 브로드캐스트가 처음부터 재생 — 허용.
- 대안 비교: Koyeb(웨이크 빠름, 카드 검증 필요) · Cloud Run(한도 넉넉, 유휴 CPU 스로틀로
  브로드캐스트 타이머 지연 가능). Fly.io는 무료 폐지, Railway는 일회성 크레딧이라 제외.
- CORS를 배포 도메인 화이트리스트로 좁힌다(현재 `*`). S12 채택 시
  `AZURE_TRANSLATOR_KEY` 환경변수 등록.

### 웹 3종 → Vercel

- **product**: Vercel 기본 배포. `NEXT_PUBLIC_DEMO_URL` = live-demo 배포 URL.
- **live-demo**: `expo export --platform web` 정적 산출물을 Vercel 정적 배포.
  `EXPO_PUBLIC_API_URL` = Koyeb URL (WS는 `wss://` — `config.ts`의 WS_BASE 유도 로직이
  https 기준으로 동작하는지 확인). S03의 `/session/:id` 등 경로는 SPA rewrite 설정.
- **Storybook**(packages/ui): `storybook build` 산출물 정적 배포.

### 마감 장치

- README 상단에 4개 링크(제품 홈페이지 / 라이브 데모 / Storybook / 서버 health) 표기.
- 배포 절차를 이 문서에 기록해 재현 가능하게 한다.

## 완성 기준

1. 새 브라우저(로그인 없음)에서 4개 링크가 모두 동작한다.
2. 라이브 데모에서 Symposia 자막 수신·CareTalk 2탭 대화(S01)가 배포 환경으로 성립한다.
3. 콜드스타트 후에도 데모 시나리오가 정상 재생된다.
4. 모든 환경변수가 저장소 문서에 기재돼 있다(비밀값 없음 확인).

## 테스트

- 자동: CI(S10)의 build 잡이 `next build`·`expo export`·`storybook build` 성공을 상시 검증.
- 수동(배포 스모크 체크리스트 — 결과를 이 문서 하단에 기록): 4개 링크 접속, 슬립 후
  콜드스타트를 일부러 발생시켜 자막 수신 재개 확인, `wss://` 대화 왕복, 다른 기기에서
  `/room/:code` QR 입장, 환경변수 전수 대조.

## 작업 분해

1. mock-server Render 배포(빌드 커맨드/헬스 체크 설정)
2. CORS 화이트리스트
3. product / live-demo / Storybook Vercel 설정 + 환경변수
4. SPA rewrite + wss 확인
5. README 링크 + 배포 절차 기록

## 범위 제외

커스텀 도메인, CDN 튜닝, 모니터링/알림, 네이티브 앱 스토어 배포(Expo Go 시연으로 대체).

## 구현 메모 — 설정·문서 (2026-09-01)

이번 범위는 **저장소에 있어야 할 것까지**다. 계정 가입·연결·실제 배포는 사람이 한다.
아래 "배포 절차"를 그대로 따라가면 링크 4개가 나온다.

### 저장소에 들어간 것

| 파일 | 무엇을 정하는가 |
|---|---|
| `render.yaml` | mock-server의 Render Blueprint — 무료 플랜·리전·빌드/시작 커맨드·`/health`·Node 버전·환경변수 **선언**(값 없음) |
| `apps/mock-server/src/cors.ts` | `ALLOWED_ORIGINS` 화이트리스트 정책 (미설정 시 기존처럼 `*`) |
| `apps/product/vercel.json` | Next 정적 export의 설치·빌드 커맨드 |
| `apps/live-demo/vercel.json` | 산출물 디렉토리 `dist` + **SPA rewrite** + 캐시 헤더 |
| `packages/ui/vercel.json` | Storybook 산출물 `storybook-static` 정적 배포 |
| `apps/live-demo/scripts/serve-web.mjs` | 배포 호스트와 같은 규칙(파일 우선 → index.html 폴백)으로 산출물을 띄우는 로컬 서버 |

### 배포하면서 드러난 것 — 고친 세 가지

1. **`EXPO_PUBLIC_*`가 웹 빌드에 전혀 반영되지 않고 있었다 (치명).**
   `config.ts`가 `process.env['EXPO_PUBLIC_API_URL']`처럼 **대괄호**로 읽고 있었는데,
   Expo의 인라인 치환은 **점 접근에만** 동작한다. 대괄호 접근은 번들에서 통째로 사라져
   `undefined`로 접히고, `?? http://localhost:4010`만 남는다. 즉 그대로 배포했다면
   **배포된 데모가 조용히 리뷰어의 localhost:4010에 붙으려 하다 실패**했을 것이다.
   실제 번들을 열어 확인한 결과:

   ```
   (수정 전) const o = `http://${t}:4010`
   (수정 후) const o = n("https://thegame-mock-server.onrender.com") ?? `http://${t}:4010`
   ```

   점 접근으로 바꾸고, 트레일링 슬래시·빈 문자열도 흡수하게 했다. 회귀를 막으려고
   `apps/live-demo/src/__tests__/config.test.ts`를 뒀다(https→wss 포함).

2. **CORS를 `*`에서 화이트리스트로 좁혔다.** 다만 `ALLOWED_ORIGINS`가 비어 있으면
   예전과 100% 같게 동작한다 — "클론만으로 실행"을 깨지 않기 위해서다.
   WebSocket 핸드셰이크에는 CORS가 적용되지 않으므로(브라우저가 막아주지 않는다)
   업그레이드 시점에 오리진을 직접 검사해 `403`으로 거절한다. `Origin` 헤더가 없는
   요청(curl·Expo 네이티브 앱·Render 헬스체크)은 그대로 통과시킨다.

3. **캐시가 환경변수 변경을 덮는다.** Metro 캐시(`/tmp/metro-cache`)는 `EXPO_PUBLIC_*`이
   바뀌어도 무효화되지 않아, 로컬에서 값만 바꿔 다시 export 하면 **예전 값이 그대로 박힌
   번들**이 나온다(재현 확인함). 그래서
   - Vercel 빌드 커맨드는 `build:deploy`(= `expo export --platform web --clear`)를 쓴다,
   - `turbo.json`의 `build` 태스크에 `env: ["NEXT_PUBLIC_*", "EXPO_PUBLIC_*"]`을 선언해
     turbo 캐시가 환경변수를 캐시 키에 넣게 했다.

### 왜 이런 커맨드인가

- **Render 빌드는 `--filter @thegame/mock-server...`로 좁힌다.** 루트에서 통짜로 설치하면
  Expo·Next·Storybook까지 받는다. 필터하면 9개 중 3개 워크스페이스(340 패키지)만 받는다 —
  무료 인스턴스의 빌드 시간·디스크를 아낀다.
- **Render 시작 커맨드는 컴파일이 없다.** `tsx`가 TS를 그대로 실행한다(`start` 스크립트).
  별도 `dist` 산출물이 없으므로 빌드 단계는 설치만 한다.
- **Vercel 설치 커맨드는 각 앱 디렉토리에서 `pnpm install --frozen-lockfile`**이다.
  pnpm이 워크스페이스 루트를 스스로 찾아 그 앱에 필요한 것만 설치하고 `workspace:*`를
  링크한다(클린 복사본에서 3종 모두 확인).
- **live-demo만 `framework: null`**이다. Expo 산출물은 프레임워크 프리셋 없이 정적
  디렉토리(`dist`)로 올리고, SPA 폴백만 rewrite로 준다. product는 `framework: "nextjs"`
  로 두어 Vercel이 `output: 'export'` 산출물(`out/`)의 라우팅·캐시 헤더를 알아서 잡게 한다.

---

## 배포 절차 (재현 가능 — 이 순서대로)

> 준비물: GitHub 계정(저장소 push됨), 브라우저. **카드 등록은 필요 없다.**
> 전체 20–30분. 이름은 아래 값을 그대로 쓰면 뒤 단계의 URL이 예시와 맞는다.

| 서비스 | 이름 | 나오는 주소 |
|---|---|---|
| Render 웹 서비스 | `thegame-mock-server` | `https://thegame-mock-server.onrender.com` |
| Vercel 프로젝트 ① | `thegame-live-demo` | `https://thegame-live-demo.vercel.app` |
| Vercel 프로젝트 ② | `thegame-product` | `https://thegame-product.vercel.app` |
| Vercel 프로젝트 ③ | `thegame-storybook` | `https://thegame-storybook.vercel.app` |

이름이 이미 선점됐으면 서비스가 접미사를 붙인다. **생성 직후 실제 주소를 반드시 확인하고**
아래 단계에서 그 값을 쓴다.

### 1단계 — Render에 mock-server 올리기 (먼저 해야 한다)

live-demo가 이 주소를 빌드 시점에 박아 넣으므로 순서상 먼저다.

1. <https://render.com> → **Get Started** → **GitHub로 로그인**.
2. 대시보드 → 우상단 **New +** → **Blueprint**.
3. 저장소 목록에서 이 저장소를 고른다. 안 보이면 **Configure account** →
   GitHub에서 이 저장소 접근 권한을 준다.
4. Branch는 `main`. Render가 루트의 `render.yaml`을 읽어 서비스 1개
   (`thegame-mock-server`, Free)를 보여준다.
5. `sync: false`로 선언된 환경변수 입력칸이 뜬다 — **지금은 전부 비워 둔다**
   (`ALLOWED_ORIGINS`는 4단계에서, Azure 키는 선택 사항).
6. **Apply / Create Resources** → 첫 빌드 2–5분. 상태가 **Live**가 되면 끝.
7. 서비스 페이지 상단의 주소를 복사한다. 브라우저에서 `<주소>/health`를 열어
   `{"ok":true}`가 나오는지 확인한다. → **이 주소를 `RENDER_URL`이라 부른다.**

> 슬립: 15분 무트래픽이면 인스턴스가 잠든다. 다음 접속의 첫 요청이 수십 초 걸린다(ADR-0006).
> 시연 직전에 `/health`를 한 번 열어 깨워 두면 된다.

### 2단계 — Vercel에 live-demo 올리기

1. <https://vercel.com> → **Sign Up / Log In** → **Continue with GitHub**.
2. 대시보드 → **Add New…** → **Project** → 이 저장소 **Import**
   (안 보이면 **Adjust GitHub App Permissions**로 접근 권한 부여).
3. Configure Project 화면에서:
   - **Project Name**: `thegame-live-demo`
   - **Root Directory**: **Edit** → `apps/live-demo` 선택 → **Continue**.
     그 아래 **"Include files outside of the Root Directory in the Build Step"**는
     **켜 둔다**(모노레포라 루트의 `pnpm-workspace.yaml`·`packages/*`가 필요하다).
   - **Framework Preset**: `Other` (그대로 둔다 — `vercel.json`이 덮어쓴다)
   - **Build and Output Settings**: **아무것도 건드리지 않는다.** 설치·빌드·출력
     디렉토리는 `apps/live-demo/vercel.json`에 있다.
   - **Environment Variables**: 아래 1개를 추가한다.

     | Key | Value |
     |---|---|
     | `EXPO_PUBLIC_API_URL` | 1단계의 `RENDER_URL` (예: `https://thegame-mock-server.onrender.com`, **끝에 `/` 없이**) |

4. **Deploy** → 2–4분.
5. 배포가 끝나면 **Settings → Domains**에서 실제 주소를 확인한다.
   → **이 주소를 `DEMO_URL`이라 부른다.**
6. **Settings → Environment Variables**로 돌아가 하나 더 추가한다.

   | Key | Value |
   |---|---|
   | `EXPO_PUBLIC_APP_URL` | 5단계의 `DEMO_URL` |

   이건 CareTalk의 **QR·초대 링크가 가리킬 도메인**이다. 웹만 쓸 거면 없어도 주소창
   origin으로 대체되지만, Expo Go(네이티브)로 시연하면 이 값이 없을 때 QR이
   `http://localhost:8081`을 가리켜 환자 폰이 열지 못한다.
7. **Deployments → 최신 배포의 `⋯` → Redeploy** → *Use existing Build Cache*는 **끄고**
   실행한다(환경변수를 새로 넣었으므로).

### 3단계 — Vercel에 product와 Storybook 올리기

같은 방식으로 **프로젝트를 2개 더** 만든다(같은 저장소를 3번 Import 하는 게 맞다).

**product**
- Project Name `thegame-product` · Root Directory `apps/product` · Framework `Next.js`(자동 감지)
- 환경변수:

  | Key | Value |
  |---|---|
  | `NEXT_PUBLIC_SITE_URL` | 이 프로젝트 자신의 주소 (`https://thegame-product.vercel.app`) |
  | `NEXT_PUBLIC_DEMO_URL` | 2단계의 `DEMO_URL` |

  `NEXT_PUBLIC_SITE_URL`은 canonical·hreflang·OG·sitemap의 절대 URL로 **정적 HTML에
  구워진다.** 첫 배포로 주소를 확인한 뒤 값을 넣고 **한 번 더 Redeploy**해야 sitemap이
  실제 도메인을 가리킨다.

**Storybook**
- Project Name `thegame-storybook` · Root Directory `packages/ui` · Framework `Other`
- 환경변수 **없음**. Deploy 한 번으로 끝난다.

### 4단계 — Render로 돌아가 CORS 잠그기

1. Render → `thegame-mock-server` → **Environment** 탭.
2. `ALLOWED_ORIGINS`에 **live-demo 주소**를 넣는다. 미리보기 배포에서도 데모를 열
   생각이면 와일드카드를 함께 넣는다.

   ```
   https://thegame-live-demo.vercel.app,https://*.vercel.app
   ```

   - product·Storybook은 목 서버를 호출하지 않으므로 넣지 않아도 된다.
   - `https://*.vercel.app`은 **누구나 배포할 수 있는 도메인**을 여는 것이다.
     데모 서버라 허용하지만, 필요 없으면 정확한 주소만 남겨라.
3. **Save Changes** → 서비스가 자동 재시작한다. 로그에
   `[mock-server] CORS: … 만 허용`이 찍히면 적용된 것이다.

### 5단계 — 스모크 체크리스트 (로그인 없는 새 브라우저 / 시크릿 창)

- [ ] `RENDER_URL/health` → `{"ok":true}`
- [ ] `DEMO_URL` 접속 → 앱이 뜬다 (콘솔에 CORS 에러 없음)
- [ ] `DEMO_URL/console`에서 `keynote-01` **시작** → `DEMO_URL`에서 자막이 흐른다 (SSE)
- [ ] `DEMO_URL/room` 의료진 입장 → 코드 확인 → 다른 기기/시크릿 창에서
      `DEMO_URL/room/<코드>` **직접 입력**해 입장 (SPA rewrite + `wss://` 왕복)
- [ ] `DEMO_URL/admin` 직접 진입 시 404가 아니다
- [ ] QR을 폰으로 찍어 열리는 주소가 `DEMO_URL`이다 (localhost가 아니다)
- [ ] product 홈에서 "라이브 데모 열기" → `DEMO_URL`로 간다
- [ ] `curl -s <PRODUCT_URL>/sitemap.xml`의 URL이 실제 도메인이다
- [ ] Storybook 주소에서 컴포넌트 목록이 뜬다
- [ ] **콜드스타트**: 15분 이상 두었다가 다시 `DEMO_URL` → 첫 연결이 느리지만
      결국 자막이 재개된다
- [ ] 브라우저 콘솔에 `blocked by CORS` / `Mixed Content` 경고가 없다

### (선택) 슬립 완화 — `/health` 핑

콜드스타트가 거슬리면 GitHub Actions cron으로 10분마다 `/health`를 때리면 된다.
다만 무료 시간(월 750 인스턴스 시간)을 상시 소모하므로 이번엔 **넣지 않았다**.

### (선택) 실번역 켜기 — S12

Azure Portal에서 **Translator** 리소스(F0 무료)를 만들어 키를 받은 뒤,
Render → Environment에 `AZURE_TRANSLATOR_KEY`(+ 지역 리소스면 `AZURE_TRANSLATOR_REGION`)를
넣고 Save 하면 된다. **키는 대시보드에만 넣는다 — 저장소·커밋·이 문서에 적지 마라.**
넣지 않아도 사전 매칭 + `[demo]` 폴백으로 데모는 그대로 돈다(ADR-0007).

---

## 환경변수 전수 표

**저장소에는 비밀값이 하나도 없다.** 추적 파일 전수 스캔으로 확인했고, `.env*`는
`.gitignore` 대상이며 커밋된 것이 없다. 비밀은 `AZURE_TRANSLATOR_KEY` 하나뿐이고
그것도 선택 사항이다.

### Render — `thegame-mock-server`

| 변수 | 비밀? | 필수? | 값의 출처 | 없으면 |
|---|---|---|---|---|
| `PORT` | 아니오 | 자동 | **Render가 주입한다.** 직접 넣지 마라 | 로컬은 `4010` |
| `NODE_VERSION` | 아니오 | 예 | `render.yaml`에 `22.20.0`으로 박혀 있다 | — |
| `ALLOWED_ORIGINS` | 아니오 | 권장 | 2단계의 `DEMO_URL` (쉼표 구분, `https://*.vercel.app` 와일드카드 가능) | **`*` — 모든 오리진 허용**(로컬 개발 기본값) |
| `AZURE_TRANSLATOR_KEY` | **예** | 아니오 | Azure Portal → Translator 리소스 → Keys | 번역 체인 ②를 건너뛰고 `[demo]` 폴백 |
| `AZURE_TRANSLATOR_REGION` | 아니오 | 아니오 | Azure 리소스의 Location (예: `koreacentral`) | 전역 리소스로 간주 |
| `AZURE_TRANSLATOR_ENDPOINT` | 아니오 | 아니오 | 전용 엔드포인트를 쓸 때만 | `https://api.cognitive.microsofttranslator.com` |
| `AZURE_TRANSLATOR_TIMEOUT_MS` | 아니오 | 아니오 | 숫자 | `3000` |

### Vercel — `thegame-live-demo` (`apps/live-demo`)

| 변수 | 비밀? | 필수? | 값의 출처 | 없으면 |
|---|---|---|---|---|
| `EXPO_PUBLIC_API_URL` | 아니오 | **예** | 1단계의 `RENDER_URL` | `http://localhost:4010` — **배포본이 죽는다** |
| `EXPO_PUBLIC_APP_URL` | 아니오 | 권장 | 2단계의 `DEMO_URL` | 웹은 주소창 origin으로 대체되지만 네이티브 QR이 localhost를 가리킨다 |

두 값 모두 **빌드 시점에 번들에 박힌다**. 바꿨으면 반드시 재배포해야 하고,
재배포 시 빌드 캐시를 쓰지 않는 편이 안전하다.

### Vercel — `thegame-product` (`apps/product`)

| 변수 | 비밀? | 필수? | 값의 출처 | 없으면 |
|---|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | 아니오 | **예** | 이 프로젝트 자신의 주소 | `http://localhost:3001` — canonical·sitemap·OG가 전부 틀린다 |
| `NEXT_PUBLIC_DEMO_URL` | 아니오 | **예** | 2단계의 `DEMO_URL` | `http://localhost:8081` — "라이브 데모 열기"가 깨진다 |

### Vercel — `thegame-storybook` (`packages/ui`)

없다.

### 로컬 개발 전용 (배포와 무관)

| 변수 | 쓰는 곳 | 설명 |
|---|---|---|
| `CHROME_PATH` | `apps/product/scripts/make-images.mjs` | OG 이미지 재생성용 크롬 경로 |
| `EXPO_PUBLIC_API_URL` | 실기기 Expo Go | `http://<PC IP>:4010` |

---

## 로컬 검증 기록 (2026-09-01)

배포 계정 작업 없이 여기까지는 확인했다.

| 확인한 것 | 방법 | 결과 |
|---|---|---|
| 3종 빌드 | `pnpm --filter @thegame/{product,live-demo,ui} build` | 모두 통과 |
| 전체 파이프라인 | `pnpm exec turbo run lint typecheck test build` | 통과 |
| **SPA rewrite** | `dist`를 `scripts/serve-web.mjs`(파일 우선 → index.html 폴백)로 띄우고 curl | `/room/ABC123` · `/room` · `/console` · `/admin` · `/session/keynote-01` 모두 **200 + 앱 셸**, `/_expo/static/...js`와 `/favicon.ico`는 실제 파일로 나감 |
| **`https` → `wss`** | 번들 실물 확인 + 유닛 테스트 | `EXPO_PUBLIC_API_URL=https://…onrender.com` → 번들에 `WS_BASE = "https://….onrender.com".replace(/^http/,'ws')` → `wss://…` |
| CORS 양쪽 | vitest 16건 + 클린 복사본 실서버 curl | 미설정 시 `*`, 설정 시 허용 오리진만 에코 + `Vary: Origin`, 차단 시 헤더 없음 + 경고 로그, WS는 403 |
| Render 빌드/시작 커맨드 | node_modules 없는 클린 복사본에서 `pnpm install --frozen-lockfile --filter @thegame/mock-server...` → `pnpm --filter @thegame/mock-server start` | 9개 중 3개 워크스페이스만 설치(340 패키지), 서버 기동·`/health` 200 |
| Vercel 설치/빌드 커맨드 | 클린 복사본의 `apps/live-demo`·`apps/product`·`packages/ui`에서 각각 실행 | 3종 모두 설치·빌드 성공, 환경변수가 산출물에 반영됨(`sitemap.xml`·번들 확인) |
| 설정 파일 문법 | YAML/JSON 파서 | `render.yaml`·`vercel.json` 3종 모두 유효 |
| 비밀값 | 추적 파일 전수 grep | 없음. `.env*` 커밋 없음 |

### 검증하지 못한 것 (계정이 필요하다)

- Render/Vercel이 실제로 이 설정을 받아들이는지 (플랜·리전 가용성, 블루프린트 파싱).
- **콜드스타트 후 자막 재개**(완성 기준 3) — 실제 슬립이 있어야 재현된다.
- 브라우저에서의 실제 CORS·`wss://` 왕복. 이 환경엔 헤드리스 브라우저가 없어
  HTTP 계층(상태코드·헤더·번들 내용)까지만 봤다. SPA rewrite도 "index.html이 200으로
  돌아온다"까지가 근거이고, 그 뒤 클라이언트 라우팅은 `src/routing/__tests__/url.test.ts`가
  맡는다.
- 완성 기준 1·2·4의 최종 판정 — 링크 4개가 나온 뒤 위 스모크 체크리스트로 한다.

## 명세와 달라진 점

- 명세 본문의 `EXPO_PUBLIC_API_URL = Koyeb URL`은 ADR-0006의 Render 채택 이전 문장이다.
  **Render URL**이 맞다.
- README 상단 링크 4종은 이번에 넣지 않았다 — 실제 URL이 나온 뒤 채운다.
- `S07`이 예고한 "`config.ts`의 WS_BASE 유도 로직이 https 기준으로 동작하는지 확인"의
  답: **유도 식 자체는 옳았고(`http`→`ws` 접두 치환이라 `https`→`wss`가 된다),
  진짜 문제는 그 앞단이었다** — 환경변수가 애초에 번들에 들어가지 않았다(위 구현 메모 1).
