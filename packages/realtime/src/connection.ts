export type ConnectionStatus =
  | { state: 'idle' }
  | { state: 'connecting'; attempt: number }
  | { state: 'open' }
  | { state: 'reconnecting'; attempt: number; delayMs: number }
  | { state: 'closed'; reason: 'manual' | 'retry-exhausted' }

export type ConnectionState = ConnectionStatus['state']
