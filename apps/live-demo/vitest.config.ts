import { defineConfig } from 'vitest/config'

// 스토어/로직 단위 테스트만 돌린다. RN 컴포넌트 렌더 테스트는 S10 범위 제외 —
// 별도 프리셋(jest-expo / react-native-testing-library)이 필요해 여기서 다루지 않는다.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
})
