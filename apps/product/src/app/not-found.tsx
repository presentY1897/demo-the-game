import Link from 'next/link'
import { DocumentHead } from '../components/DocumentHead'
import { getDict, siteLocales } from '../i18n/dictionaries'
import { localePath, withSiteName } from '../site'
import styles from './not-found.module.css'
import './globals.css'

/**
 * 정적 export의 `404.html`. 루트 레이아웃이 둘(`(entry)`/`(site)`)이라 Next는 전역
 * not-found를 **레이아웃 없이** 렌더한다 — html/body는 Next가 감싸주므로 내용만 그리고,
 * `<head>`에 필요한 것들은 React 19의 호이스팅(link/meta, precedence 붙은 style)에 맡긴다.
 * 어느 로케일인지 알 수 없는 경로이므로 ko/en을 함께 보여준다.
 */
export const metadata = {
  title: { absolute: withSiteName('en', getDict('en').notFound.title) },
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <>
      <DocumentHead />
      <main className={styles.main}>
        <p className={`mono ${styles.code}`}>{getDict('en').notFound.code}</p>
        {siteLocales.map((locale) => {
          const dict = getDict(locale)
          return (
            <section key={locale} className={styles.block} lang={locale}>
              <h1 className={styles.title}>{dict.notFound.title}</h1>
              <p className={styles.body}>{dict.notFound.body}</p>
              <Link className={styles.link} href={localePath(locale)}>
                {dict.notFound.home}
              </Link>
            </section>
          )
        })}
      </main>
    </>
  )
}
