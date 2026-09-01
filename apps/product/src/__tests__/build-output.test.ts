import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getDict, siteLocales, type SiteLocale } from '../i18n/dictionaries'
import { SITE_URL, withSiteName } from '../site'

/**
 * 빌드 산출물(`out/`) 검사. SEO 메타는 소스에서 눈으로 확인하기 어렵고 조용히 깨지기
 * 쉬워서, **실제로 나간 HTML**을 읽어 검증한다. `pnpm --filter @thegame/product test`가
 * `next build`를 먼저 돌린다.
 */
const OUT = resolve(import.meta.dirname, '..', '..', 'out')

const read = (relativePath: string): string => {
  const file = join(OUT, relativePath)
  if (!existsSync(file)) {
    throw new Error(`빌드 산출물이 없습니다: ${relativePath} — 'next build'를 먼저 실행하세요.`)
  }
  return readFileSync(file, 'utf8')
}

/** `<meta name|property="key" content="...">`의 content (속성 순서 무관) */
const meta = (html: string, key: string): string | undefined => {
  const pattern = new RegExp(
    `<meta[^>]*(?:name|property)="${key}"[^>]*content="([^"]*)"|<meta[^>]*content="([^"]*)"[^>]*(?:name|property)="${key}"`,
  )
  const match = pattern.exec(html)
  return match?.[1] ?? match?.[2]
}

/** `<link rel="..." hreflang="xx" href="...">`의 href */
const alternate = (html: string, hreflang: string): string | undefined =>
  new RegExp(`<link[^>]*hrefLang="${hreflang}"[^>]*href="([^"]*)"`, 'i').exec(html)?.[1]

const canonical = (html: string): string | undefined =>
  /<link[^>]*rel="canonical"[^>]*href="([^"]*)"/.exec(html)?.[1]

interface Page {
  locale: SiteLocale
  file: string
  path: string
  title: string
  description: string
}

const pages: Page[] = siteLocales.flatMap((locale) => {
  const dict = getDict(locale)
  return [
    {
      locale,
      file: `${locale}.html`,
      path: `/${locale}`,
      title: withSiteName(locale, dict.meta.landingTitle),
      description: dict.meta.landingDescription,
    },
    {
      locale,
      file: `${locale}/contact.html`,
      path: `/${locale}/contact`,
      title: withSiteName(locale, dict.meta.contactTitle),
      description: dict.meta.contactDescription,
    },
  ]
})

describe('sitemap.xml / robots.txt', () => {
  it('sitemap이 네 문서를 모두 담고 언어판을 교차 링크한다', () => {
    const xml = read('sitemap.xml')
    for (const page of pages) {
      expect(xml).toContain(`<loc>${SITE_URL}${page.path}</loc>`)
      for (const locale of siteLocales) {
        const href = `${SITE_URL}${page.path.replace(page.locale, locale)}`
        expect(xml).toContain(`hreflang="${locale}" href="${href}"`)
      }
    }
  })

  it('robots.txt가 크롤링을 허용하고 sitemap 위치를 알린다', () => {
    const txt = read('robots.txt')
    expect(txt).toMatch(/User-Agent: \*/i)
    expect(txt).toMatch(/Allow: \//)
    expect(txt).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`)
  })
})

describe.each(pages)('$path', (page) => {
  const html = () => read(page.file)

  it('로케일이 정적 HTML의 <html lang>에 박혀 있다', () => {
    expect(html()).toContain(`<html lang="${page.locale}"`)
  })

  it('사전에서 온 title/description을 쓴다', () => {
    expect(html()).toContain(`<title>${page.title}</title>`)
    expect(meta(html(), 'description')).toBe(page.description)
  })

  it('canonical과 ko/en/x-default hreflang이 서로 맞물린다', () => {
    expect(canonical(html())).toBe(`${SITE_URL}${page.path}`)
    for (const locale of siteLocales) {
      expect(alternate(html(), locale)).toBe(`${SITE_URL}${page.path.replace(page.locale, locale)}`)
    }
    expect(alternate(html(), 'x-default')).toBe(
      `${SITE_URL}${page.path.replace(page.locale, 'en')}`,
    )
  })

  it('og/twitter 카드가 절대 URL 이미지와 함께 있다', () => {
    expect(meta(html(), 'og:title')).toBe(page.title)
    expect(meta(html(), 'og:description')).toBe(page.description)
    expect(meta(html(), 'og:url')).toBe(`${SITE_URL}${page.path}`)
    expect(meta(html(), 'og:type')).toBe('website')
    expect(meta(html(), 'og:image')).toBe(`${SITE_URL}/og.png`)
    expect(meta(html(), 'og:image:width')).toBe('1200')
    expect(meta(html(), 'og:image:height')).toBe('630')
    expect(meta(html(), 'twitter:card')).toBe('summary_large_image')
    expect(meta(html(), 'twitter:image')).toBe(`${SITE_URL}/og.png`)
  })

  it('조직 JSON-LD 한 건이 유효한 JSON으로 들어 있다', () => {
    const scripts = [...html().matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)]
    expect(scripts).toHaveLength(1)
    const jsonLd = JSON.parse(scripts[0]?.[1] ?? '{}')
    expect(jsonLd['@type']).toBe('Organization')
    expect(jsonLd.name).toBe(getDict(page.locale).meta.siteName)
    expect(jsonLd.logo).toBe(`${SITE_URL}/logo.png`)
  })

  it('외부 오리진에서 스타일시트·스크립트를 불러오지 않는다 (성능 회귀 방지)', () => {
    // docs/perf/002: 폰트 CDN 두 곳이 렌더를 821ms 막고 390KB를 끌어왔다.
    // 링크 텍스트(문의 링크·데모 링크)는 대상이 아니고, 문서가 '가져오는' 자원만 본다.
    const fetched = [...html().matchAll(/<(?:link|script)\b[^>]*>/g)]
      .map((tag) => /(?:href|src)="([^"]+)"/.exec(tag[0])?.[1])
      .filter((url): url is string => url !== undefined && /^https?:\/\//.test(url))
      .filter((url) => !url.startsWith(SITE_URL))
    expect(fetched).toEqual([])
  })
})

describe('정적 자산', () => {
  it.each(['og.png', 'logo.png'])('%s가 산출물에 있다', (file) => {
    expect(existsSync(join(OUT, file))).toBe(true)
  })

  it('회사 소개 섹션이 랜딩에 렌더된다', () => {
    for (const locale of siteLocales) {
      const html = read(`${locale}.html`)
      expect(html).toContain('id="about"')
      expect(html).toContain(getDict(locale).about.mission)
    }
  })
})
