import localFont from 'next/font/local'
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

/**
 * 한글 브랜드 서체. **실제로 렌더되는 글자만 남긴 서브셋**을 자체 호스팅한다
 * (`scripts/subset-brand-font.mjs`, 355자 / 81KB).
 *
 * 전체 폰트(2,009KB)나 한글 전체 서브셋(1,695KB)은 한글 음절 수 때문에 쓸 수 없고,
 * 이전에 쓰던 jsDelivr 동적 서브셋은 외부 오리진에서 390KB / 15요청을 받아왔다.
 * 동일 출처 1요청 81KB라 preload가 임계 경로 안에서 끝난다. 수치는 docs/perf/002.
 *
 * `adjustFontFallback: false` — Pretendard의 메트릭이 시스템 한글 폰트와 달라
 * Next가 자동 생성하는 폴백 메트릭이 오히려 교체 시점에 흔들림을 만든다.
 * 대신 `--tg-font-sans` 토큰의 폴백 체인을 그대로 쓴다.
 */
export const brandSans = localFont({
  src: './fonts/pretendard-subset.woff2',
  weight: '45 920',
  style: 'normal',
  display: 'swap',
  preload: true,
  variable: '--tg-font-sans-web',
  adjustFontFallback: false,
})
