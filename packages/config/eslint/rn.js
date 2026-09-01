import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import base from './base.js'

/**
 * Expo React Native 프리셋.
 *
 * 웹 프리셋과 다른 점
 * - jsx-a11y를 넣지 않는다: DOM role/aria 기준이라 RN 컴포넌트에는 대부분 오탐이다.
 *   RN 접근성은 accessibilityLabel/accessibilityRole 쪽이고, 이건 S06에서 따로 다룬다.
 * - RN 전역(__DEV__)과 RN이 제공하는 브라우저 유사 전역(fetch, console 등)을 더한다.
 *
 * @type {import('eslint').Linter.Config[]}
 */
export const rnPreset = [
  ...base,

  {
    files: ['**/*.{ts,tsx,js,jsx,mjs}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        __DEV__: 'readonly',
        ErrorUtils: 'readonly',
        HermesInternal: 'readonly',
      },
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
    files: ['**/*.{ts,tsx,js,jsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/prop-types': 'off',
    },
  },

  {
    files: ['**/*.{tsx,jsx}'],
    rules: { '@thegame/no-hardcoded-ui-string': 'warn' },
  },

  {
    files: ['**/__tests__/**', '**/*.{test,spec}.{ts,tsx}'],
    rules: { '@thegame/no-hardcoded-ui-string': 'off' },
  },
]

export default rnPreset
