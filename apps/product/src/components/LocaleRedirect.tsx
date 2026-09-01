'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/** 진입 스텁(`/`)에서만 쓰는 클라이언트 리다이렉트 — 정적 export라 서버 리다이렉트가 없다 */
export function LocaleRedirect() {
  const router = useRouter()

  useEffect(() => {
    const preferred = navigator.language.toLowerCase().startsWith('ko') ? 'ko' : 'en'
    router.replace(`/${preferred}`)
  }, [router])

  return null
}
