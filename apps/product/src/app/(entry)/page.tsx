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
      {/*
        JS가 켜져 있으면 곧바로 /ko·/en으로 넘어가는 스텁이지만, 그 사이에도 문서에는
        제목이 하나 있어야 한다 — 스크린리더 사용자가 제목 목록으로 페이지를 파악한다.
        화면에는 두 링크만 두는 디자인이라 제목은 숨긴다.
      */}
      <h1 className="visually-hidden">{dict.meta.entryTitle}</h1>
      {/* 링크를 색으로만 구분하면 색각 이상 사용자에게는 본문과 같아 보인다 (WCAG 1.4.1) */}
      <p>
        <a href="/en" hrefLang="en" lang="en" style={LINK_STYLE}>
          English
        </a>{' '}
        ·{' '}
        <a href="/ko" hrefLang="ko" lang="ko" style={LINK_STYLE}>
          한국어
        </a>
      </p>
    </main>
  )
}

const LINK_STYLE = { textDecoration: 'underline', textUnderlineOffset: '3px' } as const
