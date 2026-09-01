import { Platform } from 'react-native'
import type { StorageLike } from './lastVisit'

/**
 * 플랫폼 저장소 포트.
 *
 * 웹은 localStorage. 네이티브는 아직 없다 — AsyncStorage는 비동기라
 * `StorageLike`(동기)를 그대로 만족하지 않고, 네이티브 딥링크 자체가 S03의
 * 2차 항목이라 웹 URL이 안정된 뒤 함께 붙인다. 그때 이 함수 하나만 바꾸면 된다.
 * 저장소가 없으면 복귀 배너가 안 뜰 뿐, 다른 동작은 영향받지 않는다.
 */
export function platformStorage(): StorageLike | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch (cause) {
    console.warn('[live-demo] localStorage를 쓸 수 없습니다 — 복귀 배너를 끕니다', cause)
    return null
  }
}
