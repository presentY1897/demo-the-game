import noHardcodedUiString from './rules/no-hardcoded-ui-string.js'
import noRealtimeEventParse from './rules/no-realtime-event-parse.js'

/**
 * 프로젝트 규칙 플러그인. 규칙 2종은 CLAUDE.md의 컨벤션 중
 * 리뷰로만 지켜지던 두 가지를 자동 검사로 옮긴 것이다.
 *
 * @type {import('eslint').ESLint.Plugin}
 */
const plugin = {
  meta: { name: '@thegame/eslint-plugin', version: '0.0.0' },
  rules: {
    'no-hardcoded-ui-string': noHardcodedUiString,
    'no-realtime-event-parse': noRealtimeEventParse,
  },
}

export default plugin
