import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { themeCss } from '@thegame/tokens'
import './globals.css'

export const metadata: Metadata = {
  title: 'Symposia & CareTalk — TheGame',
  description:
    'Real-time translation for aesthetic medicine congresses and clinics with international patients.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&display=swap"
        />
        <style dangerouslySetInnerHTML={{ __html: themeCss() }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
