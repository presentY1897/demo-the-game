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

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href={`/${locale}`} className={styles.brand}>
          TheGame
        </Link>
        <nav className={styles.nav} aria-label="Main">
          <Link href={`/${locale}#symposia`}>{nav.symposia}</Link>
          <Link href={`/${locale}#caretalk`}>{nav.caretalk}</Link>
          <Link href={`/${locale}/contact`}>{nav.contact}</Link>
        </nav>
        <div className={styles.actions}>
          <Link href={switchedPath} className={`mono ${styles.locale}`} aria-label="Switch language">
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
