import RNEventSource from 'react-native-sse'
import type { EventSourceFactory, EventSourceLike } from '@thegame/realtime'

/**
 * RN에는 네이티브 EventSource가 없어 react-native-sse를 EventSourceLike로
 * 감싸 CaptionStream에 주입한다 (ADR-0003). 웹에서는 이 어댑터를 쓰지 않고
 * realtime의 기본 팩토리(브라우저 EventSource)를 사용한다.
 */
export const createRnEventSource: EventSourceFactory = (url) => {
  const source = new RNEventSource(url)
  const like: EventSourceLike = {
    onopen: null,
    onmessage: null,
    onerror: null,
    close: () => {
      source.removeAllEventListeners()
      source.close()
    },
  }
  source.addEventListener('open', () => like.onopen?.())
  source.addEventListener('message', (event) => {
    const { data, lastEventId } = event as { data: string | null; lastEventId?: string | null }
    like.onmessage?.({ data: data ?? '', lastEventId: lastEventId ?? '' })
  })
  source.addEventListener('error', () => like.onerror?.())
  return like
}
