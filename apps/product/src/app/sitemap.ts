import type { MetadataRoute } from 'next'
import { siteLocales } from '../i18n/dictionaries'
import { absoluteUrl, localePath } from '../site'

/** 로케일 뒤에 붙는 문서 경로와 우선순위 */
const DOCUMENTS = [
  { suffix: '', priority: 1 },
  { suffix: '/contact', priority: 0.8 },
] as const

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return DOCUMENTS.flatMap(({ suffix, priority }) =>
    siteLocales.map((locale) => ({
      url: absoluteUrl(localePath(locale, suffix)),
      lastModified,
      changeFrequency: 'monthly' as const,
      priority,
      // 같은 문서의 다른 언어판을 sitemap 안에서도 교차 링크한다 (xhtml:link)
      alternates: {
        languages: Object.fromEntries(
          siteLocales.map((other) => [other, absoluteUrl(localePath(other, suffix))]),
        ),
      },
    })),
  )
}
