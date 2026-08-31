export { RealtimeError, type RealtimeErrorCode } from './errors'
export { backoffDelayMs, type BackoffOptions } from './backoff'
export type { ConnectionStatus, ConnectionState } from './connection'
export {
  captionEventSchema,
  conversationEventSchema,
  clientCommandSchema,
  participantRoleSchema,
  parseCaptionEvent,
  parseConversationEvent,
  type CaptionEvent,
  type ConversationEvent,
  type ClientCommand,
  type ParticipantRole,
  type ParseResult,
} from './types'
export {
  CaptionStream,
  type CaptionStreamOptions,
  type EventSourceLike,
  type EventSourceFactory,
} from './sse'
export {
  ConversationSocket,
  type ConversationSocketOptions,
  type WebSocketLike,
  type WebSocketFactory,
} from './ws'
