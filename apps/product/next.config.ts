import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // 정적 산출물로 어디서든 서빙 가능 (out/) — 폼은 클라이언트 처리라 서버 불필요
  output: 'export',
  // 내부 패키지는 TS 소스 그대로 소비한다 (ADR-0004)
  transpilePackages: ['@thegame/ui', '@thegame/tokens', '@thegame/i18n'],
}

export default nextConfig
