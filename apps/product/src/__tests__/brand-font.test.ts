import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { collectRenderedText } from '../../scripts/subset-brand-font.mjs'

/**
 * 브랜드 서체는 **실제로 렌더되는 글자만** 남긴 서브셋이다(81KB). 그래서 카피를
 * 추가하면 서브셋에 없는 글자가 생겨 그 글자만 시스템 폰트로 떨어진다 — 화면에서는
 * "한 글자만 서체가 다른" 형태로 조용히 나타난다.
 *
 * 커버리지를 테스트로 고정해, 서브셋을 다시 만들지 않고 카피를 바꾸면 CI가 막는다.
 * 고치는 법: `pnpm --filter @thegame/product font:subset` 후 산출물 2개를 커밋.
 */
const PRODUCT_DIR = resolve(import.meta.dirname, '..', '..')
const CHARSET_FILE = resolve(PRODUCT_DIR, 'src/fonts/pretendard-subset.charset.txt')

describe('브랜드 서체 서브셋 커버리지', () => {
  it('렌더되는 모든 글자가 서브셋에 들어 있다', async () => {
    const charset = new Set(readFileSync(CHARSET_FILE, 'utf8'))
    const rendered = await collectRenderedText(resolve(PRODUCT_DIR, 'out'))

    const missing = new Set<string>()
    for (const ch of rendered) {
      if (/\s/u.test(ch) || (ch.codePointAt(0) ?? 0) < 0x20) continue
      if (!charset.has(ch)) missing.add(ch)
    }

    expect(
      [...missing].sort().join(''),
      '서브셋에 없는 글자다 — pnpm --filter @thegame/product font:subset 을 다시 돌려라',
    ).toBe('')
  })

  it('서브셋 파일이 임계 경로에 부담을 주지 않는 크기다', () => {
    const bytes = readFileSync(resolve(PRODUCT_DIR, 'src/fonts/pretendard-subset.woff2')).length
    // 원본 2,009KB. 회귀(전체 폰트 커밋 등)를 막는 상한이지 목표치가 아니다.
    expect(bytes).toBeLessThan(150 * 1024)
  })
})
