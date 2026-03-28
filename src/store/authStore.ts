import { create } from 'zustand'
import { User } from '@/types'
import { supabaseAuth } from '@/services/supabase'
import { usersService } from '@/services/database'

interface AuthState {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name: string, role?: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

let isCheckingAuth = false;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  login: async (email: string, password: string) => {
    try {
      let authData, authError;
      try {
        const result = await supabaseAuth.signIn(email, password)
        authData = result.data
        authError = result.error
      } catch (err: any) {
        if (err?.message?.includes('Lock') || err?.name === 'AbortError') {
          console.warn('Auth lock stolen during login, checking session state...')
          // Use a small delay to let the other request finish
          await new Promise(resolve => setTimeout(resolve, 200));
          const { data: sessionData } = await supabaseAuth.getSession()
          if (sessionData?.session?.user) {
            authData = { user: sessionData.session.user }
          } else {
            throw err
          }
        } else {
          throw err
        }
      }

      if (authError) throw authError

      const userId = authData.user?.id
      if (!userId) throw new Error('No user ID returned')

      const { data: userData, error: userError } = await usersService.getById(userId)
      if (userError) throw userError

      if (!userData) {
        const { error: createError } = await usersService.create({
          id: userId,
          name: authData.user?.user_metadata?.name || email.split('@')[0],
          email,
          role: 'user',
        })
        
        const { data: retryData, error: retryError } = await usersService.getById(userId)
        if (retryError || !retryData) throw createError || new Error('Failed to retrieve user record')
        
        set({ user: retryData, loading: false })
      } else {
        set({ user: userData, loading: false })
      }
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  signup: async (email: string, password: string, name: string, role = 'user') => {
    try {
      let authData, authError;
      try {
        const result = await supabaseAuth.signUp(email, password, name)
        authData = result.data
        authError = result.error
      } catch (err: any) {
        if (err?.message?.includes('Lock') || err?.name === 'AbortError') {
          console.warn('Auth lock stolen during signup, checking user state...')
          await new Promise(resolve => setTimeout(resolve, 200));
          const { data: userData } = await supabaseAuth.getCurrentUser()
          if (userData?.user) {
            authData = { user: userData.user }
          } else {
            throw err
          }
        } else {
          throw err
        }
      }

      if (authError) throw authError

      const userId = authData.user?.id
      if (!userId) throw new Error('No user ID returned')

      const { error: dbError } = await usersService.create({
        id: userId,
        name,
        email,
        role: role as any,
      })
      if (dbError) throw dbError

      set({ loading: false })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  logout: async () => {
    try {
      await supabaseAuth.signOut()
      set({ user: null })
    } catch (error) {
      throw error
    }
  },

  checkAuth: async () => {
    // If we're already checking or already have a user, don't re-check
    if (isCheckingAuth) return;
    const state = useAuthStore.getState()
    if (state.user) return

    isCheckingAuth = true;
    try {
      set({ loading: true })
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Auth check timeout')), 5000)
      )

      const authPromise = (async () => {
        try {
          const { data: sessionData, error: sessionError } = await supabaseAuth.getSession()
          
          if (sessionError) {
            if (sessionError.message.includes('Lock') || sessionError.name === 'AbortError') {
              console.warn('Auth lock stolen during checkAuth, skipping manual check as another request is handling it.')
              return;
            }
            throw sessionError;
          }

          if (!sessionData?.session?.user) {
            set({ loading: false })
            return
          }

          const userId = sessionData.session.user.id
          const { data: userData, error: userError } = await usersService.getById(userId)

          if (userError) {
            console.error('Failed to fetch user profile:', userError)
            set({ loading: false })
            return
          }

          if (!userData) {
            const email = sessionData.session.user.email || ''
            await usersService.create({
              id: userId,
              name: sessionData.session.user.user_metadata?.name || email.split('@')[0],
              email,
              role: 'user',
            })
            const { data: newUserData } = await usersService.getById(userId)
            set({ user: newUserData || null, loading: false })
          } else {
            set({ user: userData, loading: false })
          }
        } catch (err: any) {
          if (err?.message?.includes('Lock') || err?.name === 'AbortError') {
            console.warn('AbortError caught in authPromise:', err.message);
            return;
          }
          throw err;
        }
      })()

      await Promise.race([authPromise, timeoutPromise])
    } catch (error) {
      console.error('Auth check error:', error)
      set({ loading: false })
    } finally {
      isCheckingAuth = false;
    }
  },

  setupAuthListener: () => {
    const { data: { subscription } } = supabaseAuth.onAuthStateChange(async (event: any, session: any) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const userId = session?.user?.id
        if (!userId) {
          set({ loading: false });
          return;
        }

        const state = useAuthStore.getState()
        // Only fetch if we don't have a user or IDs don't match
        if (!state.user || state.user.id !== userId) {
          try {
            const { data: userData } = await usersService.getById(userId)
            if (userData) {
              set({ user: userData, loading: false })
            } else {
              set({ loading: false })
            }
          } catch (error) {
            console.error('Error fetching user in listener:', error);
            set({ loading: false });
          }
        } else {
          set({ loading: false })
        }
      } else if (event === 'SIGNED_OUT') {
        set({ user: null, loading: false })
      } else if (event === 'INITIAL_SESSION') {
         // Handle initial session event if emitted
         if (!session) set({ loading: false });
      }
    })

    return () => subscription.unsubscribe()
  },
}))

