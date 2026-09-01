import { IBM_Plex_Mono } from 'next/font/google'

/**
 * 모노 폰트는 `next/font`로 **빌드 시점에 받아 자체 호스팅**한다.
 * Google Fonts CSS를 런타임에 부르면 렌더를 막고(측정: 894ms) 오리진이 하나 더 붙는다.
 * next/font는 @font-face를 앱 CSS에 인라인하고 woff2를 preload한다.
 */
export const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['500', '600'],
  display: 'swap',
  variable: '--tg-font-mono-web',
})
