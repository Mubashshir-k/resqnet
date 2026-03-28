import { create } from 'zustand'

export interface InAppNotification {
  id: string
  title: string
  message?: string
  variant: 'success' | 'error' | 'info'
  createdAt: number
}

interface UIState {
  darkMode: boolean
  notifications: InAppNotification[]
  setDarkMode: (value: boolean) => void
  toggleDarkMode: () => void
  addNotification: (item: Omit<InAppNotification, 'id' | 'createdAt'>) => void
  clearNotifications: () => void
}

const getInitialDarkMode = () => {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('resqnet-dark-mode') === 'true'
}

export const useUIStore = create<UIState>((set, get) => ({
  darkMode: getInitialDarkMode(),
  notifications: [],
  setDarkMode: (value) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('resqnet-dark-mode', String(value))
    }
    set({ darkMode: value })
  },
  toggleDarkMode: () => {
    const next = !get().darkMode
    if (typeof window !== 'undefined') {
      localStorage.setItem('resqnet-dark-mode', String(next))
    }
    set({ darkMode: next })
  },
  addNotification: (item) =>
    set((state) => ({
      notifications: [
        {
          ...item,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: Date.now(),
        },
        ...state.notifications,
      ].slice(0, 30),
    })),
  clearNotifications: () => set({ notifications: [] }),
}))
