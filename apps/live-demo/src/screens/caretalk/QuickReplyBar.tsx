import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { quickRepliesFor } from '@thegame/i18n'
import type { ParticipantRole } from '@thegame/realtime'
import { useT } from '../../i18n'
import { createThemedStyles, font, radius, space, useThemedStyles } from '../../theme'

/** S06 기준: 모든 터치 타깃은 최소 44pt */
const TOUCH_TARGET = 44

interface QuickReplyBarProps {
  role: ParticipantRole
  /** 대화 언어(`myLang`) — 앱 UI 언어가 아니라 이 사람이 말하는 언어 */
  lang: string
  collapsed: boolean
  onToggle: () => void
  /** 탭 — 즉시 전송 */
  onSelect: (text: string) => void
  /** 길게 누르기 — 입력창에 삽입 */
  onInsert: (text: string) => void
}

/**
 * 입력창 위 가로 스크롤 칩 목록 (S05).
 *
 * 아픈 상태로 낯선 병원에 온 환자가 타이핑 없이 말할 수 있게 하는 게 목적이다.
 * 문구는 `@thegame/i18n` 카탈로그가 원천이고 서버 번역 사전도 같은 표를 쓰므로,
 * 여기서 보낸 말에는 `[demo]` 폴백이 붙지 않는다.
 */
export function QuickReplyBar({
  role,
  lang,
  collapsed,
  onToggle,
  onSelect,
  onInsert,
}: QuickReplyBarProps) {
  const t = useT()
  const styles = useThemedStyles(stylesFor)
  const groups = useMemo(() => quickRepliesFor(role, lang), [role, lang])

  // 문구를 갖추지 못한 언어(zh·vi 등)에서는 칩을 내지 않는다 — 번역이 보장되지
  // 않는 문장을 "자주 쓰는 문구"라고 권할 수 없다. 자유 입력은 그대로 살아 있다.
  if (groups.length === 0) return null

  return (
    <View style={styles.bar}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('quickReply.title')}</Text>
        <Pressable
          onPress={onToggle}
          style={styles.toggle}
          accessibilityRole="button"
          accessibilityState={{ expanded: !collapsed }}
          accessibilityLabel={collapsed ? t('quickReply.expand') : t('quickReply.collapse')}
        >
          <Text style={styles.toggleText}>
            {collapsed ? t('quickReply.expand') : t('quickReply.collapse')}
          </Text>
        </Pressable>
      </View>

      {!collapsed && (
        <>
          <Text style={styles.hint}>{t('quickReply.longPressHint')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.track}
            keyboardShouldPersistTaps="handled"
          >
            {groups.map((group, index) => (
              <View key={group.group} style={styles.group}>
                {index > 0 && <View style={styles.divider} />}
                <View style={styles.groupBody}>
                  <Text style={styles.groupLabel}>{group.label}</Text>
                  <View style={styles.chips}>
                    {group.chips.map((chip) => (
                      <Pressable
                        key={chip.id}
                        style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
                        onPress={() => onSelect(chip.text)}
                        onLongPress={() => onInsert(chip.text)}
                        accessibilityRole="button"
                        accessibilityLabel={chip.text}
                        accessibilityHint={t('quickReply.longPressHint')}
                      >
                        <Text style={styles.chipText}>{chip.text}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </>
      )}
    </View>
  )
}

const stylesFor = createThemedStyles((color) => ({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
    paddingTop: space[2],
    gap: space[1],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[4],
  },
  title: { fontSize: font.sm, fontWeight: '700', color: color.text, flexShrink: 1 },
  toggle: {
    minHeight: TOUCH_TARGET,
    minWidth: TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingLeft: space[3],
  },
  toggleText: { fontSize: font.sm, fontWeight: '600', color: color.primary },
  hint: { fontSize: font.xs, color: color.textMuted, paddingHorizontal: space[4] },
  track: { paddingHorizontal: space[4], paddingVertical: space[2], gap: space[2] },
  group: { flexDirection: 'row' },
  groupBody: { gap: space[2] },
  divider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: color.border,
    marginRight: space[4],
    marginLeft: space[2],
  },
  groupLabel: { fontSize: font.xs, fontWeight: '700', color: color.textMuted },
  chips: { flexDirection: 'row', gap: space[2] },
  chip: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surfaceSubtle,
  },
  chipPressed: { borderColor: color.primary, backgroundColor: color.primarySubtle },
  chipText: { fontSize: font.md, color: color.text },
}))
