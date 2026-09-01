import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { DocumentHead } from '../../../components/DocumentHead'
import { SiteFooter } from '../../../components/SiteFooter'
import { SiteHeader } from '../../../components/SiteHeader'
import { getDict, isSiteLocale, siteLocales, type SiteLocale } from '../../../i18n/dictionaries'
import { SITE_URL, absoluteUrl, languageAlternates, localePath } from '../../../site'
import '../../globals.css'

export const dynamicParams = false

export function generateStaticParams() {
  return siteLocales.map((locale) => ({ locale }))
}

interface LocaleParams {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params
  if (!isSiteLocale(locale)) return {}
  const dict = getDict(locale)
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: dict.meta.title, template: dict.meta.titleTemplate },
    description: dict.meta.description,
    applicationName: dict.meta.siteName,
    alternates: { canonical: localePath(locale), languages: languageAlternates() },
  }
}

/** 검색엔진에 조직 정보를 한 번만 알린다 (로케일별 이름·설명) */
function organizationJsonLd(locale: SiteLocale): string {
  const dict = getDict(locale)
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: dict.meta.siteName,
    alternateName: ['TheGame', '더게임'],
    url: absoluteUrl(localePath(locale)),
    logo: absoluteUrl('/logo.png'),
    description: dict.org.description,
    address: {
      '@type': 'PostalAddress',
      streetAddress: dict.footer.address,
      addressLocality: dict.org.addressLocality,
      addressCountry: dict.org.addressCountry,
    },
    brand: [
      { '@type': 'Brand', name: 'Symposia' },
      { '@type': 'Brand', name: 'CareTalk' },
    ],
  })
}

/**
 * 로케일 트리의 **루트 레이아웃**. `(entry)`와 분리한 이유는 `<html lang>`을
 * 정적 HTML에 로케일별로 박기 위해서다 — 크롤러는 JS 실행 전 lang을 읽는다.
 */
export default async function LocaleRootLayout({
  children,
  params,
}: LocaleParams & { children: ReactNode }) {
  const { locale } = await params
  if (!isSiteLocale(locale)) notFound()
  const dict = getDict(locale)

  return (
    <html lang={locale}>
      <head>
        <DocumentHead />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: organizationJsonLd(locale) }}
        />
      </head>
      <body>
        <SiteHeader locale={locale} nav={dict.nav} />
        {children}
        <SiteFooter footer={dict.footer} />
      </body>
    </html>
  )
}
