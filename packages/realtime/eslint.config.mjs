import base from '@thegame/config/eslint/base'

// no-realtime-event-parse는 경로로 판단한다 — 이 패키지가 유일한 파싱 지점이므로
// 규칙이 스스로 통과시킨다 (packages/config/eslint/rules/no-realtime-event-parse.js).
export default base
