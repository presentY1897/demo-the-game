import { useMemo } from 'react'
import { create } from 'zustand'
import { createTranslator, type Locale, type MessageKey, type Translator } from '@thegame/i18n'

interface I18nState {
  locale: Locale
  toggle: () => void
}

export const useI18n = create<I18nState>((set) => ({
  locale: 'ko',
  toggle: () => set((state) => ({ locale: state.locale === 'ko' ? 'en' : 'ko' })),
}))

export function useT(): Translator {
  const locale = useI18n((state) => state.locale)
  return useMemo(() => createTranslator(locale), [locale])
}

/**
 * 언어 코드의 표시 이름. 목록은 기관 설정(S14)이 정하므로 i18n에 이름이 없는
 * 코드가 올 수 있다 — 그때는 키 문자열("language.xx") 대신 대문자 코드를 보여준다.
 */
export function languageLabel(t: Translator, code: string): string {
  const key = `language.${code}` as MessageKey
  const label = t(key)
  return label === key ? code.toUpperCase() : label
}
