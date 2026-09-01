import type { Metadata } from 'next'
import { getDict } from '../../i18n/dictionaries'
import { LocaleRedirect } from '../../components/LocaleRedirect'
import { languageAlternates, localePath, withSiteName } from '../../site'

const dict = getDict('en')

/**
 * `/`는 브라우저 언어를 보고 /ko·/en으로 보내는 진입 스텁이다.
 * 색인은 영어판으로 통합한다(canonical) — 이 경로 자체에는 고유 콘텐츠가 없다.
 */
export const metadata: Metadata = {
  title: { absolute: withSiteName('en', dict.meta.entryTitle) },
  description: dict.meta.description,
  alternates: { canonical: localePath('en'), languages: languageAlternates() },
}

export default function RootEntryPage() {
  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
      <LocaleRedirect />
      <p>
        <a href="/en">English</a> · <a href="/ko">한국어</a>
      </p>
    </main>
  )
}
