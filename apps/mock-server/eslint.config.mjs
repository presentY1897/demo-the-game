import base from '@thegame/config/eslint/base'

export default [
  ...base,
  {
    // mock-server는 이 프로토콜의 반대쪽 끝이라 직렬화/역직렬화를 피할 수 없다.
    // - src/conversation.ts: WS 수신 진입점의 raw 프레임 파싱 — realtime의 파싱
    //   헬퍼로 옮겨야 할 실제 부채지만, S01(방 라이프사이클) 소유 파일이다.
    // - 번역 HTTP 클라이언트: 외부 API 응답/에러 본문 파싱 — 실시간 이벤트가 아니라
    //   규칙의 대상 자체가 아니다.
    // 둘을 파일명으로 구분해 고정하면 S01/S12가 파일을 옮길 때 설정이 먼저 깨진다.
    // 서버 소스 전체에서 warn으로 드러내되 기준선(0 error)은 막지 않는다.
    // (테스트 픽스처는 base에서 이미 off — 여기서 다시 켜지 않게 제외한다)
    files: ['src/**/*.ts'],
    ignores: ['src/**/__tests__/**', 'src/**/*.{test,spec}.ts'],
    rules: { '@thegame/no-realtime-event-parse': 'warn' },
  },
]
