import react from '@thegame/config/eslint/react'

export default [
  ...react,
  {
    // 디자인 시스템 원시 컴포넌트는 i18n에 의존하지 않는다 —
    // 문자열은 전부 소비하는 앱에서 prop으로 주입한다.
    files: ['src/**/*.tsx'],
    rules: { '@thegame/no-hardcoded-ui-string': 'off' },
  },
]
