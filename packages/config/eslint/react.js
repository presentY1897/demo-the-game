import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import base from './base.js'

/**
 * 웹(React/Next) 프리셋.
 * - react recommended + jsx-runtime (React 19이라 `import React`가 필요 없다)
 * - react-hooks: 훅 규칙
 * - jsx-a11y recommended — S06 접근성 패스가 이걸 전제한다
 * - 프로젝트 커스텀 규칙: UI 문자열 하드코딩 (오탐 여지가 있어 warn)
 *
 * @type {import('eslint').Linter.Config[]}
 */
export const reactPreset = [
  ...base,

  {
    files: ['**/*.{ts,tsx,js,jsx,mjs}'],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: 'detect' } },
  },

  {
    files: ['**/*.{tsx,jsx}'],
    ...react.configs.flat.recommended,
  },
  {
    files: ['**/*.{tsx,jsx}'],
    ...react.configs.flat['jsx-runtime'],
  },
  {
    files: ['**/*.{tsx,jsx}'],
    ...jsxA11y.flatConfigs.recommended,
  },

  // recommended에서 꺼져 있지만 이 제품에서 실제로 위험한 규칙들 (S06 접근성 패스에서 추가).
  // strict 전체를 켜지 않는 이유: strict는 폐기된 label-has-for까지 포함해 오탐이 난다.
  {
    files: ['**/*.{tsx,jsx}'],
    rules: {
      // 이름 없는 아이콘 버튼·칩 — 스크린리더에서 "버튼"으로만 읽힌다
      'jsx-a11y/control-has-associated-label': 'error',
      // 포커스는 가는데 접근성 트리에는 없는 요소 (탭하면 아무것도 안 읽힌다)
      'jsx-a11y/no-aria-hidden-on-focusable': 'error',
      // "여기", "click here" — 링크 목록만 훑는 사용자에게 의미가 없다
      'jsx-a11y/anchor-ambiguous-text': 'error',
      // lang="kr" 같은 오타는 음성 엔진 선택을 통째로 어긋나게 한다
      'jsx-a11y/lang': 'error',
      // role="button"보다 <button> — 키보드 동작이 공짜로 따라온다
      'jsx-a11y/prefer-tag-over-role': 'error',
    },
  },

  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // prop-types는 TS가 대신한다
      'react/prop-types': 'off',
    },
  },

  {
    files: ['**/*.{tsx,jsx}'],
    rules: { '@thegame/no-hardcoded-ui-string': 'warn' },
  },

  // 스토리·테스트의 문자열은 리소스가 아니라 픽스처다
  {
    files: ['**/*.stories.{ts,tsx}', '**/__tests__/**', '**/*.{test,spec}.{ts,tsx}'],
    rules: { '@thegame/no-hardcoded-ui-string': 'off' },
  },
]

export default reactPreset
