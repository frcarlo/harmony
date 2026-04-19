declare module '#auth-utils' {
  interface User {
    id: string
    username: string
    role: 'admin' | 'user'
  }
  interface UserSession {
    user: User
  }
}

export {}
