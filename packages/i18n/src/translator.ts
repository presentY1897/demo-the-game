import { en, type Resources } from './resources/en'
import { ko } from './resources/ko'

export const locales = ['ko', 'en'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

export const resources = { en, ko } as const

type DotPaths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${DotPaths<T[K]>}`
}[keyof T & string]

/** `'nav.home' | 'connection.reconnecting' | ...` — 존재하는 키만 컴파일 타임에 허용 */
export type MessageKey = DotPaths<Resources>

export type Translator = (key: MessageKey, vars?: Record<string, string | number>) => string

function resolve(dict: unknown, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        typeof node === 'object' && node !== null ? (node as Record<string, unknown>)[part] : undefined,
      dict,
    )
}

export function createTranslator(locale: Locale): Translator {
  const dict = resources[locale]
  return (key, vars) => {
    const value = resolve(dict, key)
    // 누락 키는 키 문자열을 그대로 노출한다 — 빈 화면(무음 실패)보다 낫다
    if (typeof value !== 'string') return key
    if (!vars) return value
    return value.replace(/\{(\w+)\}/g, (match, name: string) => {
      const replacement = vars[name]
      return replacement === undefined ? match : String(replacement)
    })
  }
}
