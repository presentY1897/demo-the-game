import { defineConfig } from 'vitest/config'

// 스토어/로직 단위 테스트만 돌린다. RN 컴포넌트 렌더 테스트는 S10 범위 제외 —
// 별도 프리셋(jest-expo / react-native-testing-library)이 필요해 여기서 다루지 않는다.
export default defineConfig({
  // `react-native` 본체는 Flow 문법이라 vitest가 파싱하지 못한다. 컴포넌트 **모듈**을
  // import하는 테스트(렌더가 아니라 memo 여부 같은 형태 검사)를 위해 웹 구현으로 돌린다 —
  // 앱이 웹에서 실제로 쓰는 것도 이쪽이다.
  resolve: { alias: { 'react-native': 'react-native-web' } },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
})
