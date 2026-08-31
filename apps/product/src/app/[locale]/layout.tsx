import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { SetLang } from '../../components/SetLang'
import { SiteFooter } from '../../components/SiteFooter'
import { SiteHeader } from '../../components/SiteHeader'
import { getDict, isSiteLocale, siteLocales } from '../../i18n/dictionaries'

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
    title: dict.meta.title,
    description: dict.meta.description,
    alternates: { languages: { en: '/en', ko: '/ko' } },
    openGraph: {
      title: dict.meta.title,
      description: dict.meta.description,
      type: 'website',
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleParams & { children: ReactNode }) {
  const { locale } = await params
  if (!isSiteLocale(locale)) notFound()
  const dict = getDict(locale)

  return (
    <>
      <SetLang locale={locale} />
      <SiteHeader locale={locale} nav={dict.nav} />
      {children}
      <SiteFooter footer={dict.footer} />
    </>
  )
}
