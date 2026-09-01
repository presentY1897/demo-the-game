import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { DocumentHead } from '../../components/DocumentHead'
import { brandSans, plexMono } from '../../fonts'
import { getDict } from '../../i18n/dictionaries'
import { OG_IMAGE_HEIGHT, OG_IMAGE_PATH, OG_IMAGE_WIDTH, SITE_URL } from '../../site'
import '../globals.css'

const fallback = getDict('en')

/**
 * 언어 선택 스텁(`/`)의 메타데이터. `metadataBase`가 있어야 상대 경로 OG 이미지가
 * 절대 URL로 직렬화된다.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: fallback.meta.title, template: fallback.meta.titleTemplate },
  description: fallback.meta.description,
  applicationName: fallback.meta.siteName,
  openGraph: {
    type: 'website',
    siteName: fallback.meta.siteName,
    title: fallback.meta.title,
    description: fallback.meta.description,
    images: [
      {
        url: OG_IMAGE_PATH,
        width: OG_IMAGE_WIDTH,
        height: OG_IMAGE_HEIGHT,
        alt: fallback.meta.ogImageAlt,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: fallback.meta.title,
    description: fallback.meta.description,
    images: [OG_IMAGE_PATH],
  },
}

export default function EntryRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${brandSans.variable} ${plexMono.variable}`}>
      <head>
        <DocumentHead />
      </head>
      <body>{children}</body>
    </html>
  )
}
