# 0002. 라이브 데모 앱은 Expo 기반 React Native로 구현한다

- **상태**: Accepted
- **날짜**: 2026-08-31
- **관련**: [0001](./0001-pnpm-workspace-monorepo.md), [0003](./0003-sse-for-broadcast-ws-for-conversation.md)

## 맥락 (Context)

실시간 번역 데모(C)는 두 시나리오를 다룬다.
학회 참석자용 실시간 자막과 병원의 의료진↔환자 대화 통역이다.
병원 제품은 JD상 "앱 포함"이며 React Native·WebView 역량이 자격요건이다.
동시에 이 데모는 채용 담당자가 **링크 클릭만으로** 확인할 수 있어야 한다 —
앱 설치를 요구하는 순간 데모를 보지 않을 확률이 높다.

## 결정 (Decision)

Expo(managed workflow) 기반 React Native로 구현하고, `react-native-web`을 함께
설정해 **동일 코드베이스를 웹 URL로도 배포**한다. 네이티브는 Expo Go로 시연한다.

## 검토한 대안 (Alternatives)

| 대안 | 장점 | 단점 | 탈락 사유 |
|------|------|------|-----------|
| 웹(React)로만 구현 | 개발 단순, 접근성 최고 | RN 역량 증명 불가 | 자격요건(RN/WebView) 미충족 |
| bare React Native CLI | 네이티브 모듈 자유도 | 빌드 인프라 무거움, 웹 배포 별도 작업 | 데모에 네이티브 모듈이 불필요, 웹 접근성 잃음 |
| RN 앱 + 별도 웹 앱 이중 구현 | 각 플랫폼 최적화 | 동일 기능 2벌 유지보수 | 1인 개발 범위 초과, 코드 공유가 오히려 어필 포인트 |

## 결과 (Consequences)

- (+) 리뷰어는 브라우저로, 면접에서는 Expo Go로 같은 앱을 시연 가능
- (+) RN 컴포넌트 설계·플랫폼 분기(`Platform.select`) 역량을 실코드로 증명
- (+) 병원 시나리오 화면을 WebView 임베드 관점에서 설계해 자격요건의
  "WebView 환경" 항목까지 커버
- (−) `react-native-web` 미지원 API가 존재 → 스타일·애니메이션은 웹 호환 범위로 제한
- (−) 모노레포에서 Metro가 워크스페이스 의존성을 해석하도록 `metro.config.js`
  추가 설정 필요
- (−) 공유 `ui` 패키지(웹 전용 디자인 시스템)와 RN 컴포넌트는 **디자인 토큰만 공유**하고
  구현은 분리해야 함 (DOM/RN 컴포넌트 모델이 다름)
