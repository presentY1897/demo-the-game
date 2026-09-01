import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StatusBar } from 'expo-status-bar'
import { Platform, SafeAreaView } from 'react-native'
import { Screen } from './src/components/Screen'
import { useT } from './src/i18n'
import { useNav } from './src/navigation'
import { connectHistory, type HistoryEnv } from './src/routing/history'
import { AdminScreen } from './src/screens/AdminScreen'
import { CareTalkScreen } from './src/screens/CareTalkScreen'
import { ConsoleScreen } from './src/screens/ConsoleScreen'
import { HomeScreen } from './src/screens/HomeScreen'
import { SymposiaScreen } from './src/screens/SymposiaScreen'
import { useOnboarding } from './src/stores/onboardingStore'
import { saveLastVisit } from './src/storage/lastVisit'
import { platformStorage } from './src/storage/platform'
import {
  createThemedStyles,
  statusBarStyle,
  ThemeProvider,
  useTheme,
  useThemedStyles,
} from './src/theme'

const queryClient = new QueryClient()

function Router() {
  const route = useNav((state) => state.route)
  const t = useT()

  switch (route.name) {
    case 'home':
      return (
        <Screen title={t('company.name')}>
          <HomeScreen />
        </Screen>
      )
    case 'symposia':
      return (
        <Screen title={t('product.symposia.name')} showBack>
          <SymposiaScreen sessionId={route.sessionId} />
        </Screen>
      )
    case 'caretalk':
      return (
        <Screen title={t('product.careTalk.name')} showBack>
          <CareTalkScreen {...(route.inviteCode === undefined ? {} : { inviteCode: route.inviteCode })} />
        </Screen>
      )
    case 'console':
      return (
        <Screen title={t('console.title')} showBack>
          <ConsoleScreen />
        </Screen>
      )
    case 'admin':
      return (
        <Screen title={t('admin.title')} showBack>
          <AdminScreen />
        </Screen>
      )
  }
}

/** 웹에서만 라우트 ↔ 주소창을 잇는다. 네이티브는 메모리 라우트 그대로 (딥링크는 S03 2차) */
function useUrlSync(): void {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return
    return connectHistory(window as unknown as HistoryEnv)
  }, [])
}

/** 마지막으로 보던 화면을 남긴다 — 홈의 "이어서" 배너가 이걸 읽는다 */
function useLastVisitTracking(): void {
  const route = useNav((state) => state.route)
  useEffect(() => {
    if (route.name === 'home') return
    const { role, lang } = useOnboarding.getState()
    saveLastVisit(platformStorage(), { route, role, lang })
  }, [route])
}

function AppShell() {
  const { mode } = useTheme()
  const styles = useThemedStyles(stylesFor)
  useUrlSync()
  useLastVisitTracking()

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style={statusBarStyle(mode)} />
      <Router />
    </SafeAreaView>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </QueryClientProvider>
  )
}

const stylesFor = createThemedStyles((color) => ({
  root: { flex: 1, backgroundColor: color.bg },
}))
