/**
 * packages/realtime 밖에서 실시간 이벤트를 JSON.parse 하지 못하게 막는다.
 *
 * CLAUDE.md: "실시간 메시지 타입은 discriminated union으로 정의하고
 * packages/realtime에서만 파싱한다".
 *
 * 파싱 지점이 흩어지면 (1) 스키마 검증을 건너뛴 payload가 앱으로 새고
 * (2) 무음 실패(try/catch 후 return)가 생긴다. 진입점을 realtime에 모아
 * parseCaptionEvent / parseConversationEvent 만 쓰게 한다.
 *
 * 잡는 것: 허용 경로 밖 파일의 모든 `JSON.parse` 참조 (호출·별칭 모두).
 * 잡지 않는 것: allow 경로(기본 packages/realtime), 그리고 스토리지 복원처럼
 * 실시간 이벤트가 아닌 것이 명백한 호출 (localStorage / sessionStorage / AsyncStorage).
 */

const DEFAULT_ALLOW = ['packages/realtime/']
const NON_EVENT_SOURCE = /\b(localStorage|sessionStorage|AsyncStorage|SecureStore)\b/

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: '실시간 이벤트 파싱은 packages/realtime 안에서만 한다',
    },
    schema: [
      {
        type: 'object',
        properties: {
          /** 파일 경로에 이 조각이 들어가면 허용 (posix 구분자 기준) */
          allow: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      forbidden:
        'JSON.parse로 실시간 페이로드를 직접 파싱하지 마라 — @thegame/realtime의 parseCaptionEvent / parseConversationEvent를 써라 (CLAUDE.md: realtime에서만 파싱).',
    },
  },

  create(context) {
    const allow = context.options[0]?.allow ?? DEFAULT_ALLOW
    const filename = (context.filename ?? context.getFilename() ?? '').split('\\').join('/')
    if (allow.some((fragment) => filename.includes(fragment))) return {}

    const sourceCode = context.sourceCode ?? context.getSourceCode()

    return {
      'MemberExpression[object.name="JSON"][property.name="parse"]'(node) {
        const call = node.parent
        if (call?.type === 'CallExpression' && call.callee === node) {
          const [argument] = call.arguments
          if (argument && NON_EVENT_SOURCE.test(sourceCode.getText(argument))) return
        }
        context.report({ node, messageId: 'forbidden' })
      },
    }
  },
}

export default rule
