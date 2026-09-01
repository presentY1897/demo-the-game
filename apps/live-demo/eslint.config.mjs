import rn from '@thegame/config/eslint/rn'

export default [
  ...rn,
  {
    // dist-profile: 성능 측정용 프로파일링 빌드 산출물 (docs/perf/001-자막-리렌더.md)
    ignores: ['.expo/**', 'dist/**', 'dist-profile/**'],
  },
  {
    files: ['metro.config.js'],
    languageOptions: { sourceType: 'commonjs' },
  },
  {
    // 측정 하네스가 파싱하는 건 실시간 자막 이벤트가 아니라 **CDP 프로토콜 메시지**다
    // (헤드리스 크로미움 제어 — docs/perf/001-자막-리렌더.md). 규칙의 대상이 아니다.
    files: ['scripts/perf-caption.mjs'],
    rules: { '@thegame/no-realtime-event-parse': 'off' },
  },
]
