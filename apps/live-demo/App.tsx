import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaView } from 'react-native'
import { Screen } from './src/components/Screen'
import { useT } from './src/i18n'
import { useNav } from './src/navigation'
import { CareTalkScreen } from './src/screens/CareTalkScreen'
import { HomeScreen } from './src/screens/HomeScreen'
import { SymposiaScreen } from './src/screens/SymposiaScreen'
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
          <CareTalkScreen />
        </Screen>
      )
  }
}

function AppShell() {
  const { mode } = useTheme()
  const styles = useThemedStyles(stylesFor)

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
