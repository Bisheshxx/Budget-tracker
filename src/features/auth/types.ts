// Domain types owned by the auth feature — the vocabulary services, hooks,
// components, and the repository port all speak. The persistence port that
// traffics in these lives in #/data/auth/IAuthRepository. See docs/adr/0004.

export interface AuthUser {
  id: string
  email: string | null
}

export interface AuthSession {
  user: AuthUser
}

export interface Credentials {
  email: string
  password: string
}
