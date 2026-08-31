import { Platform } from 'react-native'

declare const process: { env: Record<string, string | undefined> }

// Android 에뮬레이터에서 호스트 머신은 10.0.2.2로 접근한다
const fallbackHost = Platform.select({ android: '10.0.2.2', default: 'localhost' })

export const API_BASE = process.env['EXPO_PUBLIC_API_URL'] ?? `http://${fallbackHost}:4010`
export const WS_BASE = API_BASE.replace(/^http/, 'ws')
