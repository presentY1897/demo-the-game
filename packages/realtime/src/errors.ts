export type RealtimeErrorCode =
  | 'invalid-payload'
  | 'connection-failed'
  | 'retry-exhausted'

export class RealtimeError extends Error {
  readonly code: RealtimeErrorCode

  constructor(code: RealtimeErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'RealtimeError'
    this.code = code
  }
}
