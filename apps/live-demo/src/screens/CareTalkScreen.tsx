import { useRef, useState } from 'react'
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
import { ConnectionBadge } from '../components/ConnectionBadge'
import { useConversation } from '../hooks/useConversation'
import { useT } from '../i18n'
import { useConversationStore, type ChatMessage } from '../stores/conversationStore'
import { color, font, radius, space } from '../theme'

function MessageBubble({ message }: { message: ChatMessage }) {
  const mine = message.role === 'patient'
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

export function CareTalkScreen() {
  const t = useT()
  const [draft, setDraft] = useState('')
  const listRef = useRef<FlatList<ChatMessage>>(null)

  const { say, notifyTyping } = useConversation('patient', 'en')
  const status = useConversationStore((state) => state.status)
  const messages = useConversationStore((state) => state.messages)
  const typingRole = useConversationStore((state) => state.typingRole)
  const lastError = useConversationStore((state) => state.lastError)

  const submit = () => {
    say(draft)
    setDraft('')
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.toolbar}>
        <Text style={styles.roleLabel}>
          {t('conversation.patient')} (EN) ↔ {t('conversation.staff')} (KO)
        </Text>
        <ConnectionBadge status={status} />
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(message) => message.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      {typingRole === 'staff' && (
        <Text style={styles.typing}>
          {t('conversation.typing', { role: t('conversation.staff') })}
        </Text>
      )}
      {lastError !== null && <Text style={styles.error}>{lastError}</Text>}

      <View style={styles.inputRow}>
        <TextInput
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

const styles = StyleSheet.create({
  screen: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[4],
    paddingVertical: space[3],
  },
  roleLabel: { fontSize: font.sm, fontWeight: '600', color: color.textMuted },
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
  typing: { paddingHorizontal: space[5], paddingBottom: space[2], color: color.textMuted, fontSize: font.xs },
  error: { paddingHorizontal: space[5], paddingBottom: space[2], color: color.danger, fontSize: font.xs },
  inputRow: {
    flexDirection: 'row',
    gap: space[2],
    padding: space[4],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
  input: {
    flex: 1,
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
})
