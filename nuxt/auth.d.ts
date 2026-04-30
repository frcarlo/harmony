declare module '#auth-utils' {
  interface User {
    id: string
    username: string
    role: 'admin' | 'editor' | 'user'
    allowed_areas?: string[]
  }
  interface UserSession {
    user: User
  }
}

export {}
