import Link from 'next/link'
import { DocumentHead } from '../components/DocumentHead'
import { brandSans, plexMono } from '../fonts'
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
      {/*
        `<html lang>`을 정적으로 박을 자리가 없다. 레이아웃이 없으니 Next의 래퍼가
        `<html>`을 그리는데, 여기서 직접 `<html>`을 렌더하면 그 래퍼 **안에** 중첩돼
        무효한 문서가 되고 테마 <style>까지 사라진다 (측정: out/404.html에 <html> 2개).
        스크린리더는 정적 소스가 아니라 DOM을 읽으므로, 파싱 시점에 문서 언어를 지정해
        3.1.1을 만족시킨다. 본문 두 블록에는 각각 `lang`이 따로 붙어 있다 (3.1.2).
        이 페이지는 noindex라 크롤러 쪽 손해는 없다.
      */}
      <script dangerouslySetInnerHTML={{ __html: "document.documentElement.lang='en'" }} />
      <main className={`${brandSans.variable} ${plexMono.variable} ${styles.main}`}>
        <p className={`mono ${styles.code}`}>{getDict('en').notFound.code}</p>
        {siteLocales.map((locale, index) => {
          const dict = getDict(locale)
          return (
            <section key={locale} className={styles.block} lang={locale}>
              {/* 문서에 h1은 하나여야 한다 — 두 번째 언어 블록은 h2로 내린다 */}
              {index === 0 ? (
                <h1 className={styles.title}>{dict.notFound.title}</h1>
              ) : (
                <h2 className={styles.title}>{dict.notFound.title}</h2>
              )}
              <p className={styles.body}>{dict.notFound.body}</p>
              <Link className={styles.link} href={localePath(locale)} hrefLang={locale}>
                {dict.notFound.home}
              </Link>
            </section>
          )
        })}
      </main>
    </>
  )
}
