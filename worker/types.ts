export interface Env {
  DB: D1Database
  ASSETS: Fetcher
  ENVIRONMENT?: string
  ADMIN_SETUP_KEY?: string
  ADMIN_EMAIL?: string
  ADMIN_PASSWORD?: string
  GITHUB_TOKEN?: string
}

export interface UserRow {
  id: number
  email: string
  name: string
  password_hash: string
  created_at: string
}

export type AppEnv = {
  Bindings: Env
  Variables: {
    user: UserRow
  }
}