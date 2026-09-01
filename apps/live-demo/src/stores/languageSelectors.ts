import { en } from '@thegame/i18n'
import type { AdminSettings } from '@thegame/realtime'

/**
 * 환자에게 보여줄 언어 목록은 **기관 설정(S14)이 정본**이다.
 * 설정을 못 읽었을 때만 i18n 리소스에 표시 이름이 있는 언어로 떨어진다 —
 * 목록이 비어 보이거나(무음 실패) 임의의 코드가 튀어나오지 않게.
 */

/** 의료진 쪽 언어. 데모의 병원은 한국어를 쓴다 */
export const STAFF_LANG = 'ko'

/** i18n에 이름이 있는 언어 = 앱이 온전히 라벨을 붙일 수 있는 언어 */
export const I18N_LANGS: string[] = Object.keys(en.language)

/** 기관 설정을 못 읽었을 때의 폴백 — 의료진 언어는 환자 후보에서 뺀다 */
export const FALLBACK_PATIENT_LANGS: string[] = I18N_LANGS.filter((code) => code !== STAFF_LANG)

export function selectPatientLangs(settings: AdminSettings | null | undefined): string[] {
  if (settings === null || settings === undefined) return FALLBACK_PATIENT_LANGS
  // 서버 스키마가 최소 1개를 보장하지만, 빈 목록이 새어 들어와도 화면은 비지 않는다
  return settings.patientLangs.length > 0 ? [...settings.patientLangs] : FALLBACK_PATIENT_LANGS
}

/**
 * 의료진 언어 후보. 기본은 한국어이고(F02의 병원 맥락), 기관이 켜 둔 언어로도
 * 바꿀 수 있다 — 외국인 의료진이나 코디네이터가 쓰는 경우.
 */
export function selectStaffLangs(settings: AdminSettings | null | undefined): string[] {
  const extra =
    settings === null || settings === undefined ? FALLBACK_PATIENT_LANGS : settings.supportedLangs
  return [STAFF_LANG, ...extra.filter((code) => code !== STAFF_LANG)]
}
