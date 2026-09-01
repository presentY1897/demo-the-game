import base from '@thegame/config/eslint/base'

export default [
  ...base,
  {
    // 알려진 예외: WS 서버의 수신 진입점이 raw 프레임을 직접 JSON.parse 한다.
    // realtime의 parseClientCommand 진입점으로 옮기는 건 S01(방 라이프사이클) 소유
    // 파일이라 여기서는 warn으로 드러내고 기준선만 세운다.
    files: ['src/conversation.ts'],
    rules: { '@thegame/no-realtime-event-parse': 'warn' },
  },
]
