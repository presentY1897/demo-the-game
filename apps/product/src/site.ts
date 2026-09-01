import type { Metadata } from 'next'
import { getDict, siteLocales, type SiteLocale } from './i18n/dictionaries'

/**
 * 정적 export이므로 절대 URL(canonical/hreflang/OG/sitemap)은 **빌드 시점**에 확정된다.
 * 배포 도메인이 정해지면 `NEXT_PUBLIC_SITE_URL`로 주입한다 (S07).
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001').replace(
  /\/+$/,
  '',
)

export const OG_IMAGE_PATH = '/og.png'
export const OG_IMAGE_WIDTH = 1200
export const OG_IMAGE_HEIGHT = 630

export const absoluteUrl = (path: string): string => `${SITE_URL}${path}`

/** 로케일별 같은 문서의 경로. `suffix`는 로케일 뒤에 붙는 하위 경로(''=랜딩). */
export const localePath = (locale: SiteLocale, suffix = ''): string => `/${locale}${suffix}`

/**
 * ko/en 교차 링크. `x-default`는 언어 선택 진입점(`/`)이 아니라 영어판을 가리킨다 —
 * `/`는 JS 리다이렉트 스텁이라 크롤러에게 줄 콘텐츠가 없다.
 */
export function languageAlternates(suffix = ''): Record<string, string> {
  const entries = siteLocales.map((locale) => [locale, localePath(locale, suffix)] as const)
  return { ...Object.fromEntries(entries), 'x-default': localePath('en', suffix) }
}

/**
 * 사이트명이 붙은 완전한 문서 제목을 만든다.
 * Next의 `title.template`은 **정의된 세그먼트 자신**에는 적용되지 않아
 * (`[locale]/layout`의 template이 `[locale]/page`에는 안 붙는다) 페이지 제목은
 * 항상 여기서 완성해 `title.absolute`로 넘긴다.
 */
export const withSiteName = (locale: SiteLocale, title: string): string =>
  getDict(locale).meta.titleTemplate.replace('%s', title)

interface PageMetaInput {
  locale: SiteLocale
  /** 로케일 뒤에 붙는 하위 경로 ('' 또는 '/contact') */
  suffix?: string
  /** 사이트명 없는 페이지 제목 — 여기서 `withSiteName`으로 완성한다 */
  title: string
  description: string
}

/** 페이지별 canonical · hreflang · OG · Twitter 메타를 한 곳에서 만든다. */
export function pageMetadata({ locale, suffix = '', title, description }: PageMetaInput): Metadata {
  const dict = getDict(locale)
  const path = localePath(locale, suffix)
  const fullTitle = withSiteName(locale, title)
  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: path, languages: languageAlternates(suffix) },
    openGraph: {
      type: 'website',
      siteName: dict.meta.siteName,
      locale: locale === 'ko' ? 'ko_KR' : 'en_US',
      url: absoluteUrl(path),
      title: fullTitle,
      description,
      images: [
        {
          url: OG_IMAGE_PATH,
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
          alt: dict.meta.ogImageAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [OG_IMAGE_PATH],
    },
  }
}
