import { useMemo } from 'react'
import { create } from 'zustand'
import { createTranslator, type Locale, type Translator } from '@thegame/i18n'

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
