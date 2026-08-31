import { en, type Resources } from './resources/en'
import { ko } from './resources/ko'

export const locales = ['ko', 'en'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

export const resources = { en, ko } as const

export type DotPaths<T> = {
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

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const replacement = vars[name]
    return replacement === undefined ? match : String(replacement)
  })
}

/**
 * 임의의 리소스 트리에 대한 타입 안전 translator.
 * 앱 전용 사전(마케팅 카피 등)이 공유 리소스를 오염시키지 않고
 * 같은 키 안전성을 얻을 수 있다.
 */
export function createTranslatorFor<R extends object>(
  dict: R,
): (key: DotPaths<R>, vars?: Record<string, string | number>) => string {
  return (key, vars) => {
    const value = resolve(dict, key)
    // 누락 키는 키 문자열을 그대로 노출한다 — 빈 화면(무음 실패)보다 낫다
    if (typeof value !== 'string') return key
    return interpolate(value, vars)
  }
}

export function createTranslator(locale: Locale): Translator {
  return createTranslatorFor(resources[locale]) as Translator
}
