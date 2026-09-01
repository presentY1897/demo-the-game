/**
 * UI 문자열 하드코딩 감지.
 *
 * CLAUDE.md: "UI 문자열은 하드코딩하지 않고 packages/i18n 리소스를 통해 사용한다 (ko/en)".
 * 정적 분석으로 "사람이 읽는 문장"을 완벽히 판별할 수는 없으므로, 오탐을 줄이는 방향의
 * 휴리스틱만 쓴다 (기본 심각도는 프리셋에서 warn).
 *
 * 잡는 것
 *  - JSX 텍스트 노드:            <Text>진료를 시작합니다</Text>
 *  - JSX 표현식 안의 문자열:      <Text>{'Start'}</Text>
 *  - 사용자에게 보이는 속성값:    placeholder="이름" / accessibilityLabel="닫기" / alt="로고"
 *
 * 잡지 않는 것 (의도적)
 *  - 글자가 하나도 없는 값: "—", "·", "→", "1", "%" 등 기호·숫자
 *  - ignore 패턴에 걸리는 값 (기본: 단일 단어 형태의 식별자/키/클래스명류는 제외하지 않음 —
 *    프로젝트에서 필요하면 옵션으로 추가)
 *  - t(...) 등 함수 호출 결과, 템플릿 리터럴, 변수 참조
 */

const DEFAULT_ATTRIBUTES = [
  'alt',
  'title',
  'label',
  'placeholder',
  'aria-label',
  'aria-placeholder',
  'aria-roledescription',
  'aria-valuetext',
  'accessibilityLabel',
  'accessibilityHint',
]

/** 글자(라틴·한글 등)가 하나라도 있어야 "문장"으로 본다 */
const HAS_LETTER = /\p{L}/u

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'UI에 보이는 문자열을 하드코딩하지 말고 @thegame/i18n을 통해 쓴다',
    },
    schema: [
      {
        type: 'object',
        properties: {
          /** 추가로 검사할 JSX 속성 이름 */
          attributes: { type: 'array', items: { type: 'string' } },
          /** 이 정규식에 걸리면 무시한다 (문자열 소스) */
          ignore: { type: 'array', items: { type: 'string' } },
          /** 이 길이 미만의 값은 무시한다 */
          minLength: { type: 'integer', minimum: 1 },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      hardcoded:
        'UI 문자열 "{{text}}"이(가) 하드코딩됐다 — @thegame/i18n 리소스(ko/en)를 통해 사용해라.',
    },
  },

  create(context) {
    const options = context.options[0] ?? {}
    const attributes = new Set([...DEFAULT_ATTRIBUTES, ...(options.attributes ?? [])])
    const ignore = (options.ignore ?? []).map((source) => new RegExp(source, 'u'))
    const minLength = options.minLength ?? 2

    /** @param {string} raw */
    function isUiText(raw) {
      const text = raw.trim()
      if (text.length < minLength) return false
      if (!HAS_LETTER.test(text)) return false
      return !ignore.some((pattern) => pattern.test(text))
    }

    /**
     * @param {import('estree').Node} node
     * @param {string} text
     */
    function report(node, text) {
      const trimmed = text.trim()
      context.report({
        node,
        messageId: 'hardcoded',
        data: { text: trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed },
      })
    }

    return {
      JSXText(node) {
        if (isUiText(node.value)) report(node, node.value)
      },

      // <Text>{'Start'}</Text> — 표현식으로 감싼 리터럴도 같은 하드코딩이다
      JSXExpressionContainer(node) {
        if (node.parent?.type !== 'JSXElement' && node.parent?.type !== 'JSXFragment') return
        const { expression } = node
        if (expression.type !== 'Literal' || typeof expression.value !== 'string') return
        if (isUiText(expression.value)) report(expression, expression.value)
      },

      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier') return
        if (!attributes.has(node.name.name)) return
        const value = node.value
        if (!value) return

        if (value.type === 'Literal' && typeof value.value === 'string') {
          if (isUiText(value.value)) report(value, value.value)
          return
        }
        if (
          value.type === 'JSXExpressionContainer' &&
          value.expression.type === 'Literal' &&
          typeof value.expression.value === 'string' &&
          isUiText(value.expression.value)
        ) {
          report(value.expression, value.expression.value)
        }
      },
    }
  },
}

export default rule
