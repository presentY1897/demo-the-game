import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ActivityIndicator, Pressable, Text, useWindowDimensions, View } from 'react-native'
import type { Translator } from '@thegame/i18n'
import { ADMIN_ROOMS_POLL_MS } from '../../api/admin'
import { useT } from '../../i18n'
import {
  createThemedStyles,
  font,
  radius,
  space,
  useTheme,
  useThemedStyles,
  type ThemeColors,
} from '../../theme'
import { adminRoomsQuery } from './adminQueries'
import {
  partitionRooms,
  relativeTime,
  roleLabelKeys,
  ROOM_STATUS_LABEL,
  type RoomRow,
  type RoomStatus,
} from './rooms'

/** 이 폭 아래에서는 표 대신 카드로 접는다 — 관리자는 데스크톱, 리뷰어는 폰으로 본다 */
const TABLE_BREAKPOINT = 720

/** 폴링 사이에도 "마지막 활동"이 흘러야 갱신되고 있다는 게 보인다 */
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}

function statusColor(status: RoomStatus, color: ThemeColors): string {
  switch (status) {
    case 'active':
      return color.success
    case 'waiting':
      return color.info
    case 'ended':
      return color.textMuted
  }
}

function roleText(t: Translator, row: RoomRow): string {
  return roleLabelKeys(row.room.roles)
    .map((key) => t(key))
    .join(' · ')
}

function activityText(t: Translator, at: number, now: number): string {
  const rel = relativeTime(at, now)
  return t(rel.key, rel.vars)
}

function StatusBadge({ status }: { status: RoomStatus }) {
  const t = useT()
  const { color } = useTheme()
  const styles = useThemedStyles(stylesFor)
  const tone = statusColor(status, color)

  return (
    <View style={[styles.badge, { borderColor: tone }]}>
      <View style={[styles.badgeDot, { backgroundColor: tone }]} />
      <Text style={[styles.badgeText, { color: tone }]}>{t(ROOM_STATUS_LABEL[status])}</Text>
    </View>
  )
}

function TableHeader() {
  const t = useT()
  const styles = useThemedStyles(stylesFor)

  return (
    <View style={styles.headerRow}>
      <Text style={[styles.headerCell, styles.colCode]}>{t('admin.colCode')}</Text>
      <Text style={[styles.headerCell, styles.colMembers]}>{t('admin.colMembers')}</Text>
      <Text style={[styles.headerCell, styles.colRoles]}>{t('admin.colRoles')}</Text>
      <Text style={[styles.headerCell, styles.colActivity]}>{t('admin.colActivity')}</Text>
      <Text style={[styles.headerCell, styles.colBot]}>{t('admin.colBot')}</Text>
    </View>
  )
}

function TableRow({ row, now }: { row: RoomRow; now: number }) {
  const t = useT()
  const styles = useThemedStyles(stylesFor)

  return (
    <View style={styles.tableRow}>
      <View style={styles.colCode}>
        <Text style={styles.code}>{row.room.inviteCode}</Text>
        <StatusBadge status={row.status} />
      </View>
      <Text style={[styles.cell, styles.colMembers]}>
        {t('admin.members', { count: row.room.memberCount })}
      </Text>
      <Text style={[styles.cell, styles.colRoles]}>{roleText(t, row)}</Text>
      <Text style={[styles.cell, styles.colActivity]}>
        {activityText(t, row.room.lastActivityAt, now)}
      </Text>
      <Text style={[styles.cell, styles.colBot]}>
        {row.room.botActive ? t('admin.botOn') : t('admin.botOff')}
      </Text>
    </View>
  )
}

function CardRow({ row, now }: { row: RoomRow; now: number }) {
  const t = useT()
  const styles = useThemedStyles(stylesFor)

  const fields: { label: string; value: string }[] = [
    { label: t('admin.colMembers'), value: t('admin.members', { count: row.room.memberCount }) },
    { label: t('admin.colRoles'), value: roleText(t, row) },
    { label: t('admin.colActivity'), value: activityText(t, row.room.lastActivityAt, now) },
    { label: t('admin.colBot'), value: row.room.botActive ? t('admin.botOn') : t('admin.botOff') },
  ]

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.code}>{row.room.inviteCode}</Text>
        <StatusBadge status={row.status} />
      </View>
      {fields.map((field) => (
        <View key={field.label} style={styles.cardField}>
          <Text style={styles.cardLabel}>{field.label}</Text>
          <Text style={styles.cell}>{field.value}</Text>
        </View>
      ))}
    </View>
  )
}

function RoomList({ rows, now, wide }: { rows: RoomRow[]; now: number; wide: boolean }) {
  // 행이 없으면 열 이름만 남은 빈 표를 그리지 않는다
  if (rows.length === 0) return null
  if (!wide) {
    return (
      <>
        {rows.map((row) => (
          <CardRow key={row.room.inviteCode} row={row} now={now} />
        ))}
      </>
    )
  }
  return (
    <>
      <TableHeader />
      {rows.map((row) => (
        <TableRow key={row.room.inviteCode} row={row} now={now} />
      ))}
    </>
  )
}

/**
 * 상담 현황(S14). 서버가 주는 건 코드·인원·역할·마지막 활동·봇 여부뿐이고,
 * **대화 내용은 요청하지도 받지도 않는다**(F02).
 */
export function RoomBoard() {
  const t = useT()
  const { color } = useTheme()
  const styles = useThemedStyles(stylesFor)
  const { width } = useWindowDimensions()
  const now = useNow(ADMIN_ROOMS_POLL_MS)
  const query = useQuery(adminRoomsQuery())
  const [showEnded, setShowEnded] = useState(false)

  const wide = width >= TABLE_BREAKPOINT
  const { open, ended } = partitionRooms(query.data ?? [], now)
  const failure = query.error instanceof Error ? query.error.message : null

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('admin.roomsTitle')}</Text>
      <Text style={styles.sectionHint}>{t('admin.roomsHint')}</Text>
      {query.data !== undefined && (
        <Text style={styles.sectionMeta}>
          {`${t('admin.openCount', { count: open.length })} · ${t('admin.roomsUpdated', {
            ago: activityText(t, query.dataUpdatedAt, now),
          })}`}
        </Text>
      )}

      {query.isPending && (
        <View style={styles.stateRow}>
          <ActivityIndicator color={color.primary} />
          <Text style={styles.stateText}>{t('common.loading')}</Text>
        </View>
      )}

      {query.isError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{t('admin.roomsLoadFailed')}</Text>
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

      {query.data !== undefined && open.length === 0 && (
        <Text style={styles.stateText}>{t('admin.roomsEmpty')}</Text>
      )}

      <RoomList rows={open} now={now} wide={wide} />

      {ended.length > 0 && (
        <View style={styles.endedBlock}>
          <Pressable
            onPress={() => setShowEnded((value) => !value)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showEnded }}
            style={styles.endedToggle}
          >
            <Text style={styles.endedToggleText}>
              {showEnded ? t('admin.hideEnded') : t('admin.showEnded', { count: ended.length })}
            </Text>
          </Pressable>
          {showEnded && (
            <>
              <Text style={styles.sectionHint}>{t('admin.endedHint')}</Text>
              <RoomList rows={ended} now={now} wide={wide} />
            </>
          )}
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
  sectionHint: { fontSize: font.xs, color: color.textMuted },
  sectionMeta: { fontSize: font.xs, color: color.textMuted, fontWeight: '600' },
  stateRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingVertical: space[2] },
  stateText: { fontSize: font.sm, color: color.textMuted, paddingVertical: space[2] },
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[3],
    paddingTop: space[3],
    paddingBottom: space[1],
  },
  headerCell: { fontSize: font.xs, fontWeight: '700', color: color.textMuted },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 44,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radius.md,
    backgroundColor: color.surfaceSubtle,
  },
  cell: { fontSize: font.sm, color: color.text },
  colCode: { flex: 3, flexDirection: 'row', alignItems: 'center', gap: space[2], flexWrap: 'wrap' },
  colMembers: { flex: 1 },
  colRoles: { flex: 2 },
  colActivity: { flex: 2 },
  colBot: { flex: 2 },
  code: { fontSize: font.md, fontWeight: '700', color: color.text, letterSpacing: 1 },
  card: {
    gap: space[1],
    padding: space[3],
    borderRadius: radius.md,
    backgroundColor: color.surfaceSubtle,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space[2], flexWrap: 'wrap' },
  cardField: { flexDirection: 'row', justifyContent: 'space-between', gap: space[3] },
  cardLabel: { fontSize: font.xs, color: color.textMuted },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: space[2],
    paddingVertical: 2,
  },
  badgeDot: { width: 6, height: 6, borderRadius: radius.full },
  badgeText: { fontSize: font.xs, fontWeight: '700' },
  endedBlock: { gap: space[2], marginTop: space[2] },
  endedToggle: { minHeight: 44, justifyContent: 'center' },
  endedToggleText: { fontSize: font.sm, fontWeight: '600', color: color.primary },
}))
