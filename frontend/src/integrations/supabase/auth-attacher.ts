import { createMiddleware } from '@tanstack/react-start'

// Attach the Spring Boot JWT token to server function calls.
export const attachSupabaseAuth = createMiddleware({ type: 'function' }).client(
  async ({ next }) => {
    const token = localStorage.getItem('medilink_token')
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  },
)
