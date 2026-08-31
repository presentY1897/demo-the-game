import { create } from 'zustand'

export type Route =
  | { name: 'home' }
  | { name: 'symposia'; sessionId: string }
  | { name: 'caretalk' }

interface NavState {
  route: Route
  navigate: (route: Route) => void
  back: () => void
}

export const useNav = create<NavState>((set) => ({
  route: { name: 'home' },
  navigate: (route) => set({ route }),
  back: () => set({ route: { name: 'home' } }),
}))
