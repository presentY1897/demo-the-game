/**
 * 브랜드 서체(Pretendard)를 **실제로 렌더되는 글자만** 남겨 서브셋한다.
 *
 * 한글은 음절 수가 많아 전체 서브셋이 의미가 없다 (실측: 2,009KB → 1,695KB).
 * 반면 이 사이트가 쓰는 글자는 340자 남짓이라 84KB로 떨어진다.
 * 제거 전에 쓰던 jsDelivr 동적 서브셋이 실제로 받던 양이 390KB / 15요청이었으니,
 * 동일 출처 1요청 84KB는 그보다도 가볍다. 근거 수치는 docs/perf/002.
 *
 * 사용법 (카피를 바꿨을 때만):
 *   pnpm --filter @thegame/product build         # out/ HTML 생성
 *   pnpm --filter @thegame/product font:subset   # 이 스크립트
 *
 * 산출물 2개를 함께 커밋한다:
 *   src/fonts/pretendard-subset.woff2  — 실제 폰트
 *   src/fonts/pretendard-subset.charset.txt — 담긴 글자 목록(커버리지 테스트의 계약)
 */
import { readFile, writeFile, readdir } from 'node:fs/promises'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import subsetFont from 'subset-font'

const here = dirname(fileURLToPath(import.meta.url))
const productDir = join(here, '..')
const SOURCE_URL =
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/web/variable/woff2/PretendardVariable.woff2'

/** 카피가 조금 바뀌어도 글자가 비지 않도록 두는 여유분 (실측 +6KB) */
const SAFETY_GLYPHS =
  Array.from({ length: 0x7f - 0x20 }, (_, i) => String.fromCharCode(0x20 + i)).join('') +
  '·—’‘“”…→←↑↓©®™°±×÷≥≤•※'

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) yield* htmlFiles(full)
    else if (entry.isFile() && entry.name.endsWith('.html')) yield full
  }
}

/** 빌드 산출물 HTML에서 화면에 실제로 뜨는 텍스트만 뽑는다 (스크립트/스타일 제외) */
export async function collectRenderedText(outDir) {
  let text = ''
  for await (const file of htmlFiles(outDir)) {
    const html = await readFile(file, 'utf8')
    text += html
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;|&#\d+;/g, ' ')
  }
  return text
}

function toCharset(text) {
  const chars = new Set()
  for (const ch of text + SAFETY_GLYPHS) {
    const code = ch.codePointAt(0)
    if (code === undefined || code < 0x20) continue
    if (/\s/u.test(ch)) continue
    chars.add(ch)
  }
  return [...chars].sort().join('')
}

async function main() {
  const outDir = join(productDir, 'out')
  const rendered = await collectRenderedText(outDir)
  const charset = toCharset(rendered)

  const response = await fetch(SOURCE_URL)
  if (!response.ok) throw new Error(`원본 폰트를 받지 못했다: HTTP ${response.status}`)
  const original = Buffer.from(await response.arrayBuffer())

  const subset = await subsetFont(original, charset, { targetFormat: 'woff2' })

  await writeFile(join(productDir, 'src/fonts/pretendard-subset.woff2'), subset)
  await writeFile(join(productDir, 'src/fonts/pretendard-subset.charset.txt'), charset, 'utf8')

  const kb = (n) => `${(n / 1024).toFixed(1)}KB`
  console.log(
    `글자 ${[...charset].length}자 · ${kb(original.length)} → ${kb(subset.length)} ` +
      `(${((1 - subset.length / original.length) * 100).toFixed(1)}% 감소)`,
  )
}

// 테스트가 collectRenderedText만 import할 때 폰트를 다시 만들지 않도록,
// 스크립트로 직접 실행했을 때만 본문을 돈다.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main()
}
