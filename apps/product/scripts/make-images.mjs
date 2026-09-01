/**
 * 정적 OG 이미지·로고를 헤드리스 크로미움 스크린샷으로 만든다.
 * (동적 OG 생성은 범위 밖 — 산출물은 커밋되어 있고, 원본 HTML을 고친 뒤에만 다시 돌리면 된다)
 *
 *   CHROME_PATH=/path/to/chrome node scripts/make-images.mjs
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, renameSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const chrome = process.env.CHROME_PATH
if (!chrome) {
  console.error('CHROME_PATH 환경변수에 크로미움/크롬 실행 파일 경로를 지정하세요.')
  process.exit(1)
}

const here = resolve(import.meta.dirname)
const publicDir = resolve(here, '..', 'public')

const TARGETS = [
  { html: 'og-image.html', out: 'og.png', size: '1200,630' },
  { html: 'logo.html', out: 'logo.png', size: '512,512' },
]

for (const { html, out, size } of TARGETS) {
  const work = mkdtempSync(join(tmpdir(), 'tg-og-'))
  execFileSync(chrome, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--window-size=${size}`,
    `--screenshot=${join(work, out)}`,
    `file://${join(here, html)}`,
  ], { stdio: 'inherit' })
  renameSync(join(work, out), join(publicDir, out))
  console.log(`wrote public/${out}`)
}
