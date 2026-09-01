import type { Translator } from '@thegame/i18n'
import type { ApiFailure } from '../../api/client'

/**
 * 서버의 안정 코드를 운영자가 읽을 문장으로 바꾼다.
 *
 * 모르는 코드도 문장으로 덮어 감추지 않고 코드를 그대로 붙여 보여준다 —
 * 무음 실패 금지의 마지막 단계다(CLAUDE.md). 콘솔은 시연 중에 보는 화면이라
 * "요청을 처리하지 못했습니다"만 뜨면 원인을 찾을 실마리가 사라진다.
 */
export function consoleErrorMessage(t: Translator, failure: ApiFailure): string {
  switch (failure.code) {
    case 'invalid-transition':
      return t('console.error.invalidTransition')
    case 'invalid-rate':
      return t('console.error.invalidRate')
    case 'unsupported-language':
      return t('console.error.unsupportedLanguage')
    case 'not-found':
      return t('console.error.notFound')
    case 'network':
      return t('console.error.network')
    default:
      return t('console.error.generic', { code: failure.code })
  }
}
