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
