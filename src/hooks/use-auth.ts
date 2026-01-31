import { useAuthContext } from '@/contexts/auth-context'

export function useAuth() {
  return useAuthContext()
}

// Convenience hooks
export function useUser() {
  const { user } = useAuthContext()
  return user
}

export function useIsAuthenticated() {
  const { isAuthenticated } = useAuthContext()
  return isAuthenticated
}
