import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { ActionButton } from '../../components/ActionButton'
import { languageLabel, useT } from '../../i18n'
import { AdminApiError } from '../../api/admin'
import { createThemedStyles, font, radius, space, useTheme, useThemedStyles } from '../../theme'
import { adminSettingsMutation, adminSettingsQuery } from './adminQueries'
import { sameLangs, saveErrorKey, toggleLanguage, toggleListLangs } from './languageSettings'

function LanguageToggle({
  code,
  on,
  onPress,
}: {
  code: string
  on: boolean
  onPress: () => void
}) {
  const t = useT()
  const styles = useThemedStyles(stylesFor)

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={languageLabel(t, code)}
      style={styles.langRow}
    >
      <View style={[styles.checkbox, on && styles.checkboxOn]}>
        {on && <Text style={styles.checkMark}>✓</Text>}
      </View>
      <Text style={styles.langName}>{languageLabel(t, code)}</Text>
      <Text style={styles.langCode}>{code.toUpperCase()}</Text>
    </Pressable>
  )
}

/**
 * 지원 언어 설정(S14). 저장하면 같은 쿼리 키를 보는 환자 온보딩이 즉시 따라온다.
 * 마지막 한 개를 끄는 건 서버가 400으로 거절하므로, 여기서 먼저 이유를 말해 준다.
 */
export function LanguageBoard() {
  const t = useT()
  const { color } = useTheme()
  const styles = useThemedStyles(stylesFor)
  const client = useQueryClient()
  const query = useQuery(adminSettingsQuery())
  const mutation = useMutation(adminSettingsMutation(client))

  const saved = query.data ?? null
  /** null이면 "서버 값 그대로" — 편집을 시작해야 로컬 상태가 생긴다 */
  const [draft, setDraft] = useState<string[] | null>(null)
  const [blocked, setBlocked] = useState(false)

  // 서버 값이 바뀌면(저장 성공·재조회) 편집 중이던 초안을 버린다
  const savedKey = saved === null ? '' : saved.patientLangs.join('|')
  useEffect(() => {
    setDraft(null)
    setBlocked(false)
  }, [savedKey])

  const selected = draft ?? saved?.patientLangs ?? []
  const list = saved === null ? [] : toggleListLangs(saved)
  const dirty = saved !== null && !sameLangs(selected, saved.patientLangs)
  const failure = query.error instanceof Error ? query.error.message : null

  const onToggle = (code: string): void => {
    const result = toggleLanguage(selected, list, code)
    if (!result.ok) {
      setBlocked(true)
      return
    }
    setBlocked(false)
    mutation.reset()
    setDraft(result.next)
  }

  const errorKey =
    mutation.error === null
      ? null
      : saveErrorKey(mutation.error instanceof AdminApiError ? mutation.error.code : 'unknown')

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('admin.langTitle')}</Text>
      <Text style={styles.sectionHint}>{t('admin.langHint')}</Text>

      {query.isPending && (
        <View style={styles.stateRow}>
          <ActivityIndicator color={color.primary} />
          <Text style={styles.stateText}>{t('common.loading')}</Text>
        </View>
      )}

      {query.isError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{t('admin.langLoadFailed')}</Text>
          {failure !== null && <Text style={styles.errorDetail}>{failure}</Text>}
          <Pressable
            onPress={() => void query.refetch()}
            accessibilityRole="button"
            style={styles.retry}
          >
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      )}

      {list.map((code) => (
        <LanguageToggle
          key={code}
          code={code}
          on={selected.includes(code)}
          onPress={() => onToggle(code)}
        />
      ))}

      {blocked && <Text style={styles.errorText}>{t('admin.langLastOne')}</Text>}
      {errorKey !== null && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{t(errorKey)}</Text>
          <Text style={styles.errorDetail}>
            {mutation.error instanceof Error ? mutation.error.message : ''}
          </Text>
        </View>
      )}
      {dirty && !mutation.isPending && <Text style={styles.stateText}>{t('admin.langUnsaved')}</Text>}
      {mutation.isSuccess && !dirty && <Text style={styles.savedText}>{t('admin.langSaved')}</Text>}

      {saved !== null && (
        <View style={styles.saveRow}>
          <ActionButton
            label={mutation.isPending ? t('admin.langSaving') : t('admin.langSave')}
            onPress={() => mutation.mutate(selected)}
            disabled={!dirty || mutation.isPending}
          />
        </View>
      )}
    </View>
  )
}

const stylesFor = createThemedStyles((color) => ({
  section: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.lg,
    padding: space[5],
    gap: space[2],
  },
  sectionTitle: { fontSize: font.xl, fontWeight: '700', color: color.text },
  saveRow: { alignSelf: 'flex-start', minWidth: 140, marginTop: space[2] },
  sectionHint: { fontSize: font.xs, color: color.textMuted },
  stateRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingVertical: space[2] },
  stateText: { fontSize: font.sm, color: color.textMuted },
  savedText: { fontSize: font.sm, color: color.success, fontWeight: '600' },
  errorBox: {
    gap: space[1],
    backgroundColor: color.surfaceSubtle,
    borderRadius: radius.md,
    padding: space[3],
  },
  errorText: { fontSize: font.sm, fontWeight: '600', color: color.danger },
  errorDetail: { fontSize: font.xs, color: color.textMuted },
  retry: { minHeight: 44, justifyContent: 'center' },
  retryText: { fontSize: font.sm, fontWeight: '600', color: color.primary },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 44,
    paddingHorizontal: space[3],
    borderRadius: radius.md,
    backgroundColor: color.surfaceSubtle,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: color.primary, borderColor: color.primary },
  checkMark: { color: color.onPrimary, fontSize: font.sm, fontWeight: '700', lineHeight: font.md },
  langName: { flex: 1, fontSize: font.md, color: color.text },
  langCode: { fontSize: font.xs, color: color.textMuted, fontWeight: '700' },
}))
