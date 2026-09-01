import { ScrollView, Text, View } from 'react-native'
import { useT } from '../i18n'
import { createThemedStyles, font, radius, space, useThemedStyles } from '../theme'
import { LanguageBoard } from './admin/LanguageBoard'
import { RoomBoard } from './admin/RoomBoard'

/** 데모가 어디까지인지 화면에서 밝힌다 — 인증·로그 정책이 실서비스 1순위(F02/S14) */
function ScopeNote() {
  const t = useT()
  const styles = useThemedStyles(stylesFor)

  return (
    <View style={styles.note}>
      <Text style={styles.noteTitle}>{t('admin.scopeTitle')}</Text>
      <Text style={styles.noteBody}>{t('admin.scopeAuth')}</Text>
      <Text style={styles.noteBody}>{t('admin.scopePrivacy')}</Text>
    </View>
  )
}

/**
 * 병원 내 관리자(원무·국제진료팀)의 화면(S14).
 * "읽기 위주 최소" — 상담이 몇 건 도는지 보고, 환자에게 열어 줄 언어를 켜고 끈다.
 * 상담 내용은 이 화면의 어떤 요청에도 담기지 않는다(F02).
 */
export function AdminScreen() {
  const styles = useThemedStyles(stylesFor)

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <RoomBoard />
      <LanguageBoard />
      <ScopeNote />
    </ScrollView>
  )
}

const stylesFor = createThemedStyles((color) => ({
  screen: { flex: 1 },
  content: { padding: space[5], gap: space[4] },
  note: {
    gap: space[2],
    padding: space[4],
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.border,
    backgroundColor: color.surfaceSubtle,
  },
  noteTitle: { fontSize: font.xs, fontWeight: '700', color: color.textMuted },
  noteBody: { fontSize: font.xs, color: color.textMuted, lineHeight: font.md },
}))
