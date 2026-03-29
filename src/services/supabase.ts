import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'resqnet-auth-token' // Explicitly set storage key to ensure consistency across tabs
  }
})

const handleAuthLock = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn()
  } catch (error: any) {
    if (error?.message?.includes('Lock') || error?.name === 'AbortError') {
      console.warn('Auth lock collision detected, retrying after delay...');
      await new Promise(resolve => setTimeout(resolve, 200));
      return await fn();
    }
    throw error;
  }
}

export const supabaseAuth = {
  signUp: async (email: string, password: string, name: string) => {
    return handleAuthLock(async () => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      })
      return { data, error }
    });
  },

  signIn: async (email: string, password: string) => {
return handleAuthLock(async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { data, error }
    });
  },

  signOut: async () => {
    return handleAuthLock(async () => {
      const { error } = await supabase.auth.signOut()
      return { error }
    });
  },

  getCurrentUser: async () => {
    return handleAuthLock(async () => {
      const { data, error } = await supabase.auth.getUser()
      return { data, error }
    });
  },

  getSession: async () => {
    return handleAuthLock(async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        
        // Handle specific refresh token errors gracefully
        if (error?.message?.includes('Refresh Token Not Found') || 
            error?.message?.includes('Invalid Refresh Token')) {
          console.warn('[Supabase] Refresh token error - clearing stored session')
          // Clear the corrupted session from storage
          localStorage.removeItem('resqnet-auth-token')
          return { data: null, error: null } // Return clean state instead of error
        }
        
        return { data, error }
      } catch (err) {
        console.error('[Supabase] getSession error:', err)
        return { data: null, error: err }
      }
    });
  },

  onAuthStateChange: (callback: (event: any, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback)
  },
}
