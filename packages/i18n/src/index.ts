export { en, type Resources } from './resources/en'
export { ko, type ResourceShape } from './resources/ko'
export {
  locales,
  defaultLocale,
  resources,
  createTranslator,
  createTranslatorFor,
  type DotPaths,
  type Locale,
  type MessageKey,
  type Translator,
} from './translator'
export {
  QUICK_REPLY_GROUPS,
  QUICK_REPLY_LOCALES,
  isQuickReplyLocale,
  quickRepliesFor,
  quickReplyPhrases,
  quickReplyTranslationPairs,
  type QuickReplyChip,
  type QuickReplyGroup,
  type QuickReplyGroupView,
  type QuickReplyLocale,
  type QuickReplyPhrase,
  type QuickReplyRole,
  type QuickReplyTranslationPair,
} from './quick-replies'
