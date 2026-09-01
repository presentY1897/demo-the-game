import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import type { SessionSummary } from '@thegame/realtime'
import type { SessionAction } from '../../api/sessions'
import { QrCode } from '../../components/QrCode'
import { SessionStateBadge } from '../../components/SessionStateBadge'
import { APP_ORIGIN } from '../../config'
import { useSessionControl, useSessionStatusPolling } from '../../hooks/useSessionControl'
import { useT } from '../../i18n'
import { routeToUrl } from '../../routing/url'
import { selectControls, selectProgress } from '../../stores/consoleSelectors'
import { useConsoleStore } from '../../stores/consoleStore'
import { createThemedStyles, font, radius, space, useThemedStyles } from '../../theme'
import { CaptionMonitor } from './CaptionMonitor'
import { consoleErrorMessage } from './errors'

/** 1 → "1.0", 0.5 → "0.5", 1.25 → "1.25". 정수 배속도 소수점을 달아 자릿수가 튀지 않게 */
function formatRate(rate: number): string {
  return Number.isInteger(rate) ? rate.toFixed(1) : String(rate)
}

interface ControlButtonProps {
  label: string
  onPress: () => void
  enabled: boolean
  tone?: 'primary' | 'neutral' | 'danger'
  /** 속도 −/＋ 처럼 폭을 넓히면 안 되는 버튼 */
  compact?: boolean
  accessibilityLabel?: string
}

/**
 * 잠긴 버튼은 색까지 잃는다(tone은 활성일 때만 칠한다) — 흐려진 파란 "시작"은
 * 운영석에서 "지금 누를 수 있는 것"으로 잘못 읽힌다.
 */
function ControlButton({
  label,
  onPress,
  enabled,
  tone = 'neutral',
  compact = false,
  accessibilityLabel,
}: ControlButtonProps) {
  const styles = useThemedStyles(stylesFor)
  const painted = enabled ? tone : 'neutral'

  return (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !enabled }}
      {...(accessibilityLabel === undefined ? {} : { accessibilityLabel })}
      style={[
        styles.control,
        compact && styles.controlCompact,
        painted === 'primary' && styles.controlPrimary,
        painted === 'danger' && styles.controlDanger,
        !enabled && styles.controlDisabled,
      ]}
    >
      <Text
        style={[
          styles.controlText,
          painted === 'primary' && styles.controlTextPrimary,
          painted === 'danger' && styles.controlTextDanger,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

/**
 * 세션 상세(운영) — 간사·발표자가 행사 중에 보는 한 화면.
 *
 * 위에서 아래로 실제 동선 순서다: 입장 코드/QR(참석자를 들여보낸다) → 시작·정지 →
 * 속도 → 모니터(제대로 나가는지 확인). 상태는 서버 폴링이 정본이라 버튼은
 * `selectControls`가 허락한 것만 눌린다 — 불가능한 전이는 눌리기 전에 잠긴다.
 */
export function SessionDetailView({ session }: { session: SessionSummary }) {
  const t = useT()
  const styles = useThemedStyles(stylesFor)
  const close = useConsoleStore((state) => state.close)
  const dismissFailure = useConsoleStore((state) => state.dismissFailure)
  const status = useConsoleStore((state) => state.status)
  const pending = useConsoleStore((state) => state.pending)
  const failure = useConsoleStore((state) => state.failure)
  const [monitorOn, setMonitorOn] = useState(true)

  useSessionStatusPolling(session.id)
  const { run, changeRate } = useSessionControl()

  const controls = selectControls(status, pending)
  const progress = selectProgress(status)
  const state = status?.state ?? session.state
  const joinUrl = routeToUrl(APP_ORIGIN, { name: 'symposia', sessionId: session.id })

  const control = (action: SessionAction) => () => run(action)

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable onPress={close} accessibilityRole="button" style={styles.backRow} hitSlop={8}>
        <Text style={styles.backText}>‹ {t('console.detail.back')}</Text>
      </Pressable>

      <View style={styles.headerBlock}>
        <Text style={styles.title}>{session.title}</Text>
        <Text style={styles.speaker}>
          {session.speaker} · {session.sourceLang.toUpperCase()} →{' '}
          {session.targetLangs.map((lang) => lang.toUpperCase()).join(', ')}
        </Text>
        <View style={styles.statusRow}>
          <SessionStateBadge state={state} />
          <Text style={styles.viewers}>
            {t('console.viewers', { count: status?.viewerCount ?? session.viewerCount })}
          </Text>
        </View>
      </View>

      {/* 입장 — 코드와 QR이 한 화면에 있어야 장내 게시와 구두 안내를 동시에 한다 */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>{t('console.detail.entryTitle')}</Text>
        <Text style={styles.code} accessibilityLabel={session.id.toUpperCase()}>
          {session.id.toUpperCase()}
        </Text>
        <Text style={styles.hint}>{t('console.detail.entryHint')}</Text>
        <QrCode value={joinUrl} />
        <Text style={styles.sectionLabel}>{t('console.detail.link')}</Text>
        <Text style={styles.link} selectable>
          {joinUrl}
        </Text>
      </View>

      {/* 라이프사이클 제어 */}
      <View style={styles.card}>
        <View style={styles.controlRow}>
          <ControlButton
            label={t('console.actions.start')}
            onPress={control('start')}
            enabled={controls.start}
            tone="primary"
          />
          <ControlButton
            label={t('console.actions.pause')}
            onPress={control('pause')}
            enabled={controls.pause}
          />
          <ControlButton
            label={t('console.actions.resume')}
            onPress={control('resume')}
            enabled={controls.resume}
            tone="primary"
          />
          <ControlButton
            label={t('console.actions.end')}
            onPress={control('end')}
            enabled={controls.end}
            tone="danger"
          />
        </View>

        {pending !== null && <Text style={styles.hint}>{t('console.actions.working')}</Text>}
        {state === 'ended' && <Text style={styles.hint}>{t('console.detail.endedNote')}</Text>}

        {failure !== null && (
          <Pressable
            onPress={dismissFailure}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            style={styles.errorBox}
          >
            <Text style={styles.errorText}>{consoleErrorMessage(t, failure)}</Text>
          </Pressable>
        )}

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <Text style={styles.hint}>
          {t('console.detail.progress', {
            position: status?.position ?? 0,
            total: status?.total ?? 0,
          })}
        </Text>
      </View>

      {/* 발표 속도 — 실서비스의 마이크 STT 대신 스크립트 재생 속도를 준다(F01) */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>{t('console.rate.label')}</Text>
        <View style={styles.rateRow}>
          <ControlButton
            label="−"
            accessibilityLabel={t('console.rate.slower')}
            onPress={() => changeRate(-1)}
            enabled={controls.slower}
            compact
          />
          <Text style={styles.rateValue}>
            {t('console.rate.value', { rate: formatRate(status?.rate ?? 1) })}
          </Text>
          <ControlButton
            label="＋"
            accessibilityLabel={t('console.rate.faster')}
            onPress={() => changeRate(1)}
            enabled={controls.faster}
            compact
          />
        </View>
        <Text style={styles.hint}>{t('console.rate.hint')}</Text>
      </View>

      {/* 자막 모니터 */}
      <View style={styles.card}>
        <View style={styles.monitorHeader}>
          <Text style={styles.sectionLabel}>{t('console.monitor.title')}</Text>
          <Pressable
            onPress={() => setMonitorOn((on) => !on)}
            accessibilityRole="switch"
            accessibilityState={{ checked: monitorOn }}
            accessibilityLabel={t('console.monitor.show')}
            style={[styles.toggle, monitorOn && styles.toggleActive]}
          >
            <Text style={[styles.toggleText, monitorOn && styles.toggleTextActive]}>
              {t('console.monitor.show')}
            </Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>{t('console.monitor.hint')}</Text>
        {monitorOn && (
          <>
            <CaptionMonitor sessionId={session.id} targetLangs={session.targetLangs} />
            <Text style={styles.hint}>{t('console.detail.viewersHint')}</Text>
          </>
        )}
      </View>
    </ScrollView>
  )
}

const stylesFor = createThemedStyles((color) => ({
  screen: { flex: 1 },
  content: { padding: space[5], gap: space[3] },
  backRow: { minHeight: 32, justifyContent: 'center' },
  backText: { fontSize: font.sm, fontWeight: '600', color: color.primary },
  headerBlock: { gap: space[2] },
  title: { fontSize: font.xl, fontWeight: '700', color: color.text },
  speaker: { fontSize: font.xs, color: color.textMuted },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  viewers: { fontSize: font.xs, color: color.textMuted },
  card: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.lg,
    padding: space[5],
    gap: space[3],
  },
  sectionLabel: { fontSize: font.xs, fontWeight: '700', color: color.textMuted },
  code: {
    fontSize: font['3xl'],
    fontWeight: '700',
    color: color.text,
    letterSpacing: 6,
    textAlign: 'center',
  },
  hint: { fontSize: font.xs, color: color.textMuted },
  link: { fontSize: font.xs, color: color.primary },
  controlRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  control: {
    flexGrow: 1,
    flexBasis: 88,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surfaceSubtle,
  },
  controlCompact: { flexGrow: 0, flexBasis: 'auto', minWidth: 64 },
  controlPrimary: { backgroundColor: color.primary, borderColor: color.primary },
  controlDanger: { backgroundColor: color.surfaceSubtle, borderColor: color.danger },
  controlDisabled: { opacity: 0.4 },
  controlText: { fontSize: font.sm, fontWeight: '700', color: color.text },
  controlTextPrimary: { color: color.onPrimary },
  controlTextDanger: { color: color.danger },
  errorBox: {
    padding: space[3],
    borderRadius: radius.md,
    backgroundColor: `${color.danger}1F`,
  },
  errorText: { fontSize: font.sm, color: color.danger },
  progressTrack: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: color.surfaceSubtle,
    overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: radius.full, backgroundColor: color.primary },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  rateValue: {
    flex: 1,
    minWidth: 72,
    textAlign: 'center',
    fontSize: font.lg,
    fontWeight: '700',
    color: color.text,
  },
  monitorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
  },
  toggle: {
    paddingHorizontal: space[3],
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: color.surfaceSubtle,
  },
  toggleActive: { backgroundColor: color.primary },
  toggleText: { fontSize: font.xs, fontWeight: '600', color: color.textMuted },
  toggleTextActive: { color: color.onPrimary },
}))
