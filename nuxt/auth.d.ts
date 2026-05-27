declare module '#auth-utils' {
  interface User {
    id: string
    username: string
    role: 'admin' | 'editor' | 'user'
    force_kiosk?: boolean
    force_performance_mode?: boolean | null
    force_device_type?: string | null
    allowed_areas?: string[]
    allowed_widget_types?: string[]
  }
  interface UserSession {
    user: User
  }
}

export {}
