import { createMiddleware } from '@tanstack/react-start'

// Stub — Supabase auth middleware replaced by Spring Boot JWT.
export const requireSupabaseAuth = createMiddleware({ type: 'function' }).server(
  async ({ next }) => next({}),
)
