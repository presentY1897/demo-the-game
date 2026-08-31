'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function RootRedirect() {
  const router = useRouter()

  useEffect(() => {
    const preferred = navigator.language.toLowerCase().startsWith('ko') ? 'ko' : 'en'
    router.replace(`/${preferred}`)
  }, [router])

  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
      <p>
        <a href="/en">English</a> · <a href="/ko">한국어</a>
      </p>
    </main>
  )
}
