import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import thegame from './plugin.js'

/** 빌드 산출물·의존성은 어느 워크스페이스에서도 검사하지 않는다 */
export const ignores = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/.expo/**',
  '**/out/**',
  '**/storybook-static/**',
  '**/coverage/**',
  '**/.turbo/**',
  '**/*.tsbuildinfo',
  '**/next-env.d.ts',
]

/**
 * 공통(ts) 프리셋.
 * - eslint recommended + typescript-eslint recommended (타입 정보 없는 빠른 세트)
 * - 프로젝트 커스텀 규칙: realtime 밖 JSON.parse 금지
 *
 * @type {import('eslint').Linter.Config[]}
 */
export const base = [
  { ignores },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      // 워크스페이스 대부분이 node 스크립트/설정 파일을 함께 담고 있다.
      // 브라우저·RN 전역은 react / rn 프리셋에서 더한다.
      globals: { ...globals.es2023, ...globals.node },
    },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    plugins: { '@thegame': thegame },
    rules: {
      // `_` 접두사는 "의도적으로 안 쓴다"는 표시로 통용한다
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'after-used',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      // CLAUDE.md: 무음 실패를 만들지 않는다 — 빈 catch는 금지, 빈 블록은 허용
      'no-empty': ['error', { allowEmptyCatch: false }],
      '@thegame/no-realtime-event-parse': 'error',
    },
  },

  // 설정 파일(js/mjs)에는 TS 전용 규칙을 적용하지 않는다
  {
    files: ['**/*.{js,mjs,cjs}'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },

  // 테스트에서는 하네스 목적의 any/빈 함수가 정당하고, 픽스처를 JSON.parse로
  // 되읽는 것도 정상이다 (요청 바디 검증 등) — 실시간 파싱 규칙의 대상이 아니다
  {
    files: ['**/__tests__/**/*.{ts,tsx}', '**/*.{test,spec}.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@thegame/no-realtime-event-parse': 'off',
    },
  },
]

export default base
