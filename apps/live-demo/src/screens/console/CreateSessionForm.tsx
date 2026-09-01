import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'
import type { SessionSummary } from '@thegame/realtime'
import { createSession } from '../../api/sessions'
import { languageLabel, useT } from '../../i18n'
import { createThemedStyles, font, radius, space, useTheme, useThemedStyles } from '../../theme'
import { consoleErrorMessage } from './errors'

/**
 * 새 세션이 고를 수 있는 언어. 자막 소스가 데모 스크립트(keynote) 템플릿이라
 * 템플릿에 문장이 있는 언어만 가능하다(S13 명세: "템플릿 기반").
 *
 * 서버는 이 목록을 노출하는 엔드포인트를 따로 두지 않아 여기 상수로 둔다. 대신 목록이
 * 서버와 어긋나면 `unsupported-language`가 폼 안에 그대로 뜬다 — 조용히 실패하지 않는다.
 */
const TEMPLATE_LANGS = ['ko', 'en', 'ja', 'zh'] as const

const DEFAULT_SOURCE = 'ko'
const DEFAULT_TARGETS = ['en', 'ja', 'zh']

interface CreateSessionFormProps {
  onCreated: (session: SessionSummary) => void
  onCancel: () => void
}

/**
 * 세션 생성 폼 — 행사 직전 운영석에서 30초 안에 채우는 화면이라
 * 제목·발표자만 입력이고 언어는 기본값(한국어 발표 → EN/JA/ZH 자막)이 미리 찍혀 있다.
 */
export function CreateSessionForm({ onCreated, onCancel }: CreateSessionFormProps) {
  const t = useT()
  const { color } = useTheme()
  const styles = useThemedStyles(stylesFor)
  const queryClient = useQueryClient()

  const [title, setTitle] = useState('')
  const [speaker, setSpeaker] = useState('')
  const [sourceLang, setSourceLang] = useState<string>(DEFAULT_SOURCE)
  const [targetLangs, setTargetLangs] = useState<string[]>(DEFAULT_TARGETS)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const pickSource = (lang: string): void => {
    setSourceLang(lang)
    // 원문 언어를 자막 언어로 함께 보내면 서버가 400으로 거절한다 — 미리 뺀다
    setTargetLangs((current) => current.filter((code) => code !== lang))
  }

  const toggleTarget = (lang: string): void => {
    setTargetLangs((current) =>
      current.includes(lang) ? current.filter((code) => code !== lang) : [...current, lang],
    )
  }

  const submit = (): void => {
    if (busy) return
    if (title.trim() === '') {
      setError(t('console.create.nameRequired'))
      return
    }
    if (speaker.trim() === '') {
      setError(t('console.create.speakerRequired'))
      return
    }
    if (targetLangs.length === 0) {
      setError(t('console.create.targetsRequired'))
      return
    }

    setError(null)
    setBusy(true)
    void createSession({
      title: title.trim(),
      speaker: speaker.trim(),
      sourceLang,
      targetLangs,
    }).then((result) => {
      setBusy(false)
      if (!result.ok) {
        // 서버 검증 실패(unsupported-language 등)는 폼 안에서 설명한다
        setError(consoleErrorMessage(t, result.error))
        return
      }
      void queryClient.invalidateQueries({ queryKey: ['sessions'] })
      onCreated(result.value)
    })
  }

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>{t('console.create.title')}</Text>

      <View style={styles.field}>
        <Text style={styles.label}>{t('console.create.name')}</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder={t('console.create.namePlaceholder')}
          placeholderTextColor={color.textMuted}
          editable={!busy}
          accessibilityLabel={t('console.create.name')}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{t('console.create.speaker')}</Text>
        <TextInput
          style={styles.input}
          value={speaker}
          onChangeText={setSpeaker}
          placeholder={t('console.create.speakerPlaceholder')}
          placeholderTextColor={color.textMuted}
          editable={!busy}
          accessibilityLabel={t('console.create.speaker')}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{t('console.create.sourceLang')}</Text>
        <View style={styles.chips}>
          {TEMPLATE_LANGS.map((lang) => {
            const selected = sourceLang === lang
            return (
              <Pressable
                key={lang}
                onPress={() => pickSource(lang)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[styles.chip, selected && styles.chipActive]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                  {languageLabel(t, lang)}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{t('console.create.targetLangs')}</Text>
        <View style={styles.chips}>
          {TEMPLATE_LANGS.filter((lang) => lang !== sourceLang).map((lang) => {
            const selected = targetLangs.includes(lang)
            return (
              <Pressable
                key={lang}
                onPress={() => toggleTarget(lang)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                style={[styles.chip, selected && styles.chipActive]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                  {languageLabel(t, lang)}
                </Text>
              </Pressable>
            )
          })}
        </View>
        <Text style={styles.hint}>{t('console.create.targetHint')}</Text>
      </View>

      {error !== null && <Text style={styles.error}>{error}</Text>}

      <View style={styles.actions}>
        <Pressable
          onPress={onCancel}
          disabled={busy}
          accessibilityRole="button"
          style={[styles.secondaryButton, busy && styles.buttonDisabled]}
        >
          <Text style={styles.secondaryText}>{t('console.create.cancel')}</Text>
        </Pressable>
        <Pressable
          onPress={submit}
          disabled={busy}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          style={[styles.primaryButton, busy && styles.buttonDisabled]}
        >
          {busy ? (
            <ActivityIndicator color={color.onPrimary} />
          ) : (
            <Text style={styles.primaryText}>{t('console.create.submit')}</Text>
          )}
        </Pressable>
      </View>
    </View>
  )
}

const stylesFor = createThemedStyles((color) => ({
  card: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.lg,
    padding: space[5],
    gap: space[4],
  },
  heading: { fontSize: font.lg, fontWeight: '700', color: color.text },
  field: { gap: space[2] },
  label: { fontSize: font.xs, fontWeight: '700', color: color.textMuted },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    paddingVertical: 10,
    fontSize: font.md,
    color: color.text,
    backgroundColor: color.bg,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: space[4],
    borderRadius: radius.full,
    backgroundColor: color.surfaceSubtle,
    borderWidth: 1,
    borderColor: color.border,
  },
  chipActive: { backgroundColor: color.primary, borderColor: color.primary },
  chipText: { fontSize: font.sm, fontWeight: '600', color: color.textMuted },
  chipTextActive: { color: color.onPrimary },
  hint: { fontSize: font.xs, color: color.textMuted },
  error: { fontSize: font.sm, color: color.danger },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space[2] },
  primaryButton: {
    minHeight: 44,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[4],
    borderRadius: radius.md,
    backgroundColor: color.primary,
  },
  primaryText: { fontSize: font.sm, fontWeight: '700', color: color.onPrimary },
  secondaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[4],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surfaceSubtle,
  },
  secondaryText: { fontSize: font.sm, fontWeight: '600', color: color.text },
  buttonDisabled: { opacity: 0.5 },
}))
