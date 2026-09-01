import type { AdminSettings } from '@thegame/realtime/http'

/**
 * 기관이 환자에게 제공할 수 있는 언어 후보(S14).
 * 관리자는 이 목록 안에서만 켜고 끌 수 있고, 목록 밖 코드는 거부한다.
 */
export const SUPPORTED_PATIENT_LANGS = ['en', 'ja', 'zh', 'vi', 'ru', 'mn'] as const
export const DEFAULT_PATIENT_LANGS: string[] = ['en', 'ja', 'zh']

export type UpdateSettingsResult =
  | { ok: true; settings: AdminSettings }
  | { ok: false; code: 'unsupported-language' | 'empty-language-list'; message: string }

/** 기관 설정 — 메모리 보관, 영속화 없음(S14) */
export class SettingsStore {
  #patientLangs: string[]

  constructor(patientLangs: string[] = DEFAULT_PATIENT_LANGS) {
    this.#patientLangs = [...patientLangs]
  }

  get(): AdminSettings {
    return { patientLangs: [...this.#patientLangs], supportedLangs: [...SUPPORTED_PATIENT_LANGS] }
  }

  update(patientLangs: readonly string[]): UpdateSettingsResult {
    const next: string[] = []
    for (const lang of patientLangs) {
      if (!SUPPORTED_PATIENT_LANGS.some((supported) => supported === lang)) {
        return {
          ok: false,
          code: 'unsupported-language',
          message: `unsupported language "${lang}" — allowed: ${SUPPORTED_PATIENT_LANGS.join(', ')}`,
        }
      }
      if (!next.includes(lang)) next.push(lang)
    }
    if (next.length === 0) {
      return {
        ok: false,
        code: 'empty-language-list',
        message: 'patientLangs must contain at least one language',
      }
    }
    this.#patientLangs = next
    return { ok: true, settings: this.get() }
  }
}
