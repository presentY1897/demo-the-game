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
