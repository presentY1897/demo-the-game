'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ButtonLink } from '@thegame/ui'
import type { SiteDict, SiteLocale } from '../i18n/dictionaries'
import styles from './SiteHeader.module.css'

const DEMO_URL = process.env.NEXT_PUBLIC_DEMO_URL ?? 'http://localhost:8081'

export function SiteHeader({ locale, nav }: { locale: SiteLocale; nav: SiteDict['nav'] }) {
  const pathname = usePathname()
  const other: SiteLocale = locale === 'ko' ? 'en' : 'ko'
  const switchedPath = pathname.startsWith(`/${locale}`)
    ? pathname.replace(`/${locale}`, `/${other}`)
    : `/${other}`
  const onContact = pathname.startsWith(`/${locale}/contact`)

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href={`/${locale}`} className={styles.brand}>
          TheGame
        </Link>
        {/* landmark 이름은 페이지 언어로 읽혀야 한다 — 하드코딩 'Main'은 ko 페이지에서 영어로 읽혔다 */}
        <nav className={styles.nav} aria-label={nav.label}>
          <Link href={`/${locale}#symposia`}>{nav.symposia}</Link>
          <Link href={`/${locale}#caretalk`}>{nav.caretalk}</Link>
          <Link href={`/${locale}/contact`} aria-current={onContact ? 'page' : undefined}>
            {nav.contact}
          </Link>
        </nav>
        <div className={styles.actions}>
          {/* 보이는 글자는 "KO"/"EN" 두 글자뿐이라 링크 목록만 훑으면 용도를 알 수 없다 */}
          <Link
            href={switchedPath}
            className={`mono ${styles.locale}`}
            hrefLang={other}
            aria-label={nav.switchLanguage}
          >
            {other.toUpperCase()}
          </Link>
          <ButtonLink href={DEMO_URL} size="sm" target="_blank" rel="noreferrer">
            {nav.liveDemo}
          </ButtonLink>
        </div>
      </div>
    </header>
  )
}
