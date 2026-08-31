'use client'

import { useEffect } from 'react'

/** 루트 레이아웃의 <html lang>은 정적이라, 로케일 세그먼트 진입 시 보정한다 */
export function SetLang({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])
  return null
}
