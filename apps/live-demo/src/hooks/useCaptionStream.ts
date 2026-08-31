import { useEffect } from 'react'
import { Platform } from 'react-native'
import { CaptionStream } from '@thegame/realtime'
import { createRnEventSource } from '../adapters/eventSource'
import { API_BASE } from '../config'
import { useCaptionStore } from '../stores/captionStore'

/**
 * 화면 진입 시 SSE 스트림을 열고 스토어에 연결한다.
 * retryToken을 바꾸면 스트림을 새로 연다 (재시도 버튼용).
 */
export function useCaptionStream(sessionId: string, lang: string, retryToken = 0): void {
  useEffect(() => {
    useCaptionStore.getState().reset()
    const stream = new CaptionStream({
      url: `${API_BASE}/api/sessions/${encodeURIComponent(sessionId)}/stream?lang=${encodeURIComponent(lang)}`,
      onEvent: (event) => useCaptionStore.getState().handleEvent(event),
      onStatus: (status) => useCaptionStore.getState().setStatus(status),
      onError: (error) => useCaptionStore.getState().setError(error.message),
      ...(Platform.OS === 'web' ? {} : { createEventSource: createRnEventSource }),
    })
    stream.connect()
    return () => stream.close()
  }, [sessionId, lang, retryToken])
}
