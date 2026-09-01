import { useMemo, useRef, useState } from 'react'
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import type { ParticipantRole } from '@thegame/realtime'
import { ConnectionBadge } from '../../components/ConnectionBadge'
import { languageLabel, useT } from '../../i18n'
import { selectPeerLang } from '../../stores/conversationSelectors'
import { useConversationStore, type ChatMessage } from '../../stores/conversationStore'
import { createThemedStyles, font, radius, space, useTheme, useThemedStyles } from '../../theme'
import { QuickReplyBar } from './QuickReplyBar'
import { createQuickReplyHandlers, nextCollapsed } from './quickReply'

function MessageBubble({ message, myRole }: { message: ChatMessage; myRole: ParticipantRole }) {
  const styles = useThemedStyles(stylesFor)
  const mine = message.role === myRole
  return (
    <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowOther]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
        <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{message.text}</Text>
        <Text style={[styles.translation, mine && styles.translationMine]}>
          {message.translationText}
        </Text>
      </View>
    </View>
  )
}

interface ConversationViewProps {
  myRole: ParticipantRole
  myLang: string
  say: (text: string) => void
  notifyTyping: () => void
}

export function ConversationView({ myRole, myLang, say, notifyTyping }: ConversationViewProps) {
  const t = useT()
  const { color } = useTheme()
  const styles = useThemedStyles(stylesFor)
  const [draft, setDraft] = useState('')
  // 칩 영역은 처음엔 펼쳐 둔다 — 타이핑 부담을 줄이는 게 이 화면의 기본값(S05)
  const [chipsCollapsed, setChipsCollapsed] = useState(false)
  const listRef = useRef<FlatList<ChatMessage>>(null)
  const inputRef = useRef<TextInput>(null)

  const status = useConversationStore((state) => state.status)
  const messages = useConversationStore((state) => state.messages)
  const typingRole = useConversationStore((state) => state.typingRole)
  const lastError = useConversationStore((state) => state.lastError)

  const peerRole: ParticipantRole = myRole === 'patient' ? 'staff' : 'patient'
  const peerLang = selectPeerLang(messages, myRole)
  const submit = () => {
    say(draft)
    setDraft('')
  }

  const quickReply = useMemo(
    () =>
      createQuickReplyHandlers({
        say,
        draft,
        setDraft,
        focusInput: () => inputRef.current?.focus(),
      }),
    [say, draft],
  )

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.toolbar}>
        <Text style={styles.roleLabel}>
          {peerLang === null
            ? t('conversation.langPairUnknown', {
                myRole: t(`conversation.${myRole}`),
                myLang: languageLabel(t, myLang),
                peerRole: t(`conversation.${peerRole}`),
              })
            : t('conversation.langPair', {
                myRole: t(`conversation.${myRole}`),
                myLang: languageLabel(t, myLang),
                peerRole: t(`conversation.${peerRole}`),
                peerLang: languageLabel(t, peerLang),
              })}
        </Text>
        <ConnectionBadge status={status} />
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(message) => message.id}
        renderItem={({ item }) => <MessageBubble message={item} myRole={myRole} />}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      {typingRole !== null && typingRole !== myRole && (
        <Text style={styles.typing}>
          {t('conversation.typing', { role: t(`conversation.${typingRole}`) })}
        </Text>
      )}
      {lastError !== null && <Text style={styles.error}>{lastError}</Text>}

      <QuickReplyBar
        role={myRole}
        lang={myLang}
        collapsed={chipsCollapsed}
        onToggle={() => setChipsCollapsed((current) => nextCollapsed('toggle', current, draft))}
        onSelect={quickReply.onTap}
        onInsert={quickReply.onLongPress}
      />

      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={draft}
          onChangeText={(text) => {
            setDraft(text)
            if (text.length > 0) notifyTyping()
          }}
          placeholder={t('conversation.inputPlaceholder')}
          placeholderTextColor={color.textMuted}
          onSubmitEditing={submit}
          returnKeyType="send"
          // 키보드가 올라오면 칩이 대화를 가린다 — 포커스에 맞춰 접고, 초안 없이
          // 빠져나오면 다시 펼친다 (S05)
          onFocus={() => setChipsCollapsed((current) => nextCollapsed('focus', current, draft))}
          onBlur={() => setChipsCollapsed((current) => nextCollapsed('blur', current, draft))}
        />
        <Pressable
          style={[styles.sendButton, draft.trim() === '' && styles.sendButtonDisabled]}
          onPress={submit}
          disabled={draft.trim() === ''}
          accessibilityRole="button"
        >
          <Text style={styles.sendText}>{t('conversation.send')}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

const stylesFor = createThemedStyles((color) => ({
  screen: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingVertical: space[3],
  },
  roleLabel: { fontSize: font.sm, fontWeight: '600', color: color.textMuted, flexShrink: 1 },
  listContent: { padding: space[4], gap: space[3] },
  bubbleRow: { flexDirection: 'row' },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowOther: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '82%',
    borderRadius: radius.lg,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    gap: space[1],
  },
  bubbleMine: { backgroundColor: color.primary, borderBottomRightRadius: radius.sm },
  bubbleOther: { backgroundColor: color.surfaceSubtle, borderBottomLeftRadius: radius.sm },
  bubbleText: { fontSize: font.md, color: color.text },
  bubbleTextMine: { color: color.onPrimary },
  translation: { fontSize: font.sm, color: color.textMuted },
  translationMine: { color: `${color.onPrimary}C0` },
  typing: {
    paddingHorizontal: space[5],
    paddingBottom: space[2],
    color: color.textMuted,
    fontSize: font.xs,
  },
  error: {
    paddingHorizontal: space[5],
    paddingBottom: space[2],
    color: color.danger,
    fontSize: font.xs,
  },
  inputRow: {
    flexDirection: 'row',
    gap: space[2],
    padding: space[4],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    paddingVertical: 10,
    fontSize: font.md,
    color: color.text,
    backgroundColor: color.surface,
  },
  sendButton: {
    backgroundColor: color.primary,
    borderRadius: radius.md,
    paddingHorizontal: space[5],
    justifyContent: 'center',
  },
  sendButtonDisabled: { opacity: 0.5 },
  sendText: { color: color.onPrimary, fontWeight: '700', fontSize: font.sm },
}))
