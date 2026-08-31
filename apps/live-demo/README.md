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
- **CareTalk 화면**: 환자(EN) ↔ 의료진(KO, 봇 대행) 채팅 — 말풍선에 원문+번역,
  typing 인디케이터, 연결 끊김 중 입력은 전송 큐에 쌓였다가 재연결 시 flush.
- **디자인**: `@thegame/tokens` 원값을 RN StyleSheet로 소비 (`theme.ts`).
  UI 문자열은 `@thegame/i18n` (헤더에서 ko/en 전환).
- **내비게이션**: 화면 3개뿐이라 라우팅 라이브러리 없이 Zustand 라우트 스토어로
  처리 (`navigation.ts`) — 의존성 최소화를 위한 의도적 선택.
