import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'

export function useAuth() {
  const { user, loading, checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return { user, loading }
}
