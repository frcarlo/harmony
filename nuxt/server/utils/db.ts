import { DatabaseSync } from 'node:sqlite'
import path from 'path'
import fs from 'fs'
import type { Dashboard, Widget, DashboardListItem, NotificationRule, DefaultDashboardResolution } from '~/types/dashboard'

export interface DbUser {
  id: string
  username: string
  email: string | null
  password_hash: string | null
  role: 'admin' | 'editor' | 'user'
  force_kiosk: boolean
  force_performance_mode: boolean | null
  force_device_type: string | null
  allowed_areas: string[] | null
  provider: string | null
  provider_id: string | null
  default_dashboard_id: string | null
  user_default_dashboard_id: string | null
  created_at: string
}

let _db: DatabaseSync | null = null

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function getDb(): DatabaseSync {
  if (_db) return _db

  const config = getServerConfig()
  const dataDir = config.dataDir ?? path.join(process.cwd(), 'data')
  const dbPath = path.join(dataDir, 'dashboards.db')

  fs.mkdirSync(dataDir, { recursive: true })
  _db = new DatabaseSync(dbPath)
  _db.exec('PRAGMA journal_mode = WAL')
  _db.exec('PRAGMA foreign_keys = ON')

  _db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT,
      password_hash TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      force_kiosk INTEGER NOT NULL DEFAULT 0,
      force_performance_mode INTEGER,
      force_device_type TEXT,
      provider TEXT,
      provider_id TEXT,
      default_dashboard_id TEXT,
      user_default_dashboard_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notification_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      trigger_entity_id TEXT NOT NULL,
      trigger_state TEXT NOT NULL DEFAULT 'on',
      action_type TEXT NOT NULL DEFAULT 'entity',
      action_entity_id TEXT NOT NULL,
      cooldown_seconds INTEGER NOT NULL DEFAULT 30,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dashboards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT,
      background TEXT,
      theme_override TEXT,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS widgets (
      id TEXT PRIMARY KEY,
      dashboard_id TEXT NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      layout TEXT NOT NULL,
      config TEXT NOT NULL,
      appearance TEXT,
      visibility TEXT,
      position INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT,
      detail TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dashboard_access (
      user_id TEXT NOT NULL,
      dashboard_id TEXT NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, dashboard_id)
    );

    CREATE TABLE IF NOT EXISTS notification_log (
      id TEXT PRIMARY KEY,
      rule_id TEXT NOT NULL,
      rule_name TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      entity_state TEXT NOT NULL,
      triggered_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS global_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)

  // Migrations
  const widgetCols = _db.prepare('PRAGMA table_info(widgets)').all() as Array<{ name: string }>
  if (!widgetCols.some((c) => c.name === 'appearance')) {
    _db.exec('ALTER TABLE widgets ADD COLUMN appearance TEXT')
  }
  if (!widgetCols.some((c) => c.name === 'visibility')) {
    _db.exec('ALTER TABLE widgets ADD COLUMN visibility TEXT')
  }
  const dashCols = _db.prepare('PRAGMA table_info(dashboards)').all() as Array<{ name: string }>
  const userCols = _db.prepare('PRAGMA table_info(users)').all() as Array<{ name: string }>
  if (!userCols.some((c) => c.name === 'default_dashboard_id')) {
    _db.exec('ALTER TABLE users ADD COLUMN default_dashboard_id TEXT')
  }
  if (!userCols.some((c) => c.name === 'user_default_dashboard_id')) {
    _db.exec('ALTER TABLE users ADD COLUMN user_default_dashboard_id TEXT')
  }
  if (!userCols.some((c) => c.name === 'allowed_areas')) {
    _db.exec('ALTER TABLE users ADD COLUMN allowed_areas TEXT')
  }
  if (!userCols.some((c) => c.name === 'force_kiosk')) {
    _db.exec('ALTER TABLE users ADD COLUMN force_kiosk INTEGER NOT NULL DEFAULT 0')
  }
  if (!userCols.some((c) => c.name === 'force_performance_mode')) {
    _db.exec('ALTER TABLE users ADD COLUMN force_performance_mode INTEGER')
  }
  if (!userCols.some((c) => c.name === 'force_device_type')) {
    _db.exec('ALTER TABLE users ADD COLUMN force_device_type TEXT')
  }
  if (!dashCols.some((c) => c.name === 'sort_order')) {
    _db.exec('ALTER TABLE dashboards ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0')
    _db.exec('UPDATE dashboards SET sort_order = rowid')
  }
  if (!dashCols.some((c) => c.name === 'grid_config')) {
    _db.exec('ALTER TABLE dashboards ADD COLUMN grid_config TEXT')
  }
  if (!dashCols.some((c) => c.name === 'theme_override')) {
    _db.exec('ALTER TABLE dashboards ADD COLUMN theme_override TEXT')
  }
  if (!dashCols.some((c) => c.name === 'is_default')) {
    _db.exec('ALTER TABLE dashboards ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0')
  }
  if (!dashCols.some((c) => c.name === 'bg_opacity')) {
    _db.exec('ALTER TABLE dashboards ADD COLUMN bg_opacity INTEGER')
  }
  if (!dashCols.some((c) => c.name === 'bg_size')) {
    _db.exec('ALTER TABLE dashboards ADD COLUMN bg_size TEXT')
  }

  return _db
}

// ── Audit Log ──────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string
  user_id: string
  username: string
  action: string
  target?: string
  detail?: string
  created_at: string
}

export function addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'created_at'>): void {
  const db = getDb()
  db.prepare(`INSERT INTO audit_log (id, user_id, username, action, target, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(crypto.randomUUID(), entry.user_id, entry.username, entry.action, entry.target ?? null, entry.detail ?? null, new Date().toISOString())
  db.prepare(`DELETE FROM audit_log WHERE id NOT IN (SELECT id FROM audit_log ORDER BY created_at DESC LIMIT 500)`).run()
}

export function listAuditLog(limit = 100): AuditLogEntry[] {
  const db = getDb()
  return db.prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?').all(limit) as unknown as AuditLogEntry[]
}

// ── Dashboard Access ────────────────────────────────────────────────────────

export function getDashboardAccessForUser(userId: string): string[] | null {
  const db = getDb()
  const rows = db.prepare('SELECT dashboard_id FROM dashboard_access WHERE user_id = ?').all(userId) as Array<{ dashboard_id: string }>
  if (rows.length === 0) return null // null = no restriction, all visible
  return rows.map((r) => r.dashboard_id)
}

export function setDashboardAccessForUser(userId: string, dashboardIds: string[]): void {
  const db = getDb()
  db.prepare('DELETE FROM dashboard_access WHERE user_id = ?').run(userId)
  const stmt = db.prepare('INSERT INTO dashboard_access (user_id, dashboard_id) VALUES (?, ?)')
  for (const id of dashboardIds) stmt.run(userId, id)
}

export function listDashboards(userId?: string, role?: string): DashboardListItem[] {
  const db = getDb()
  const all = db.prepare('SELECT * FROM dashboards ORDER BY sort_order ASC, created_at ASC').all() as unknown as DashboardListItem[]
  if (!userId || role === 'admin') return all
  const allowed = getDashboardAccessForUser(userId)
  if (allowed === null) return all // no restrictions set → show all
  return all.filter((d) => allowed.includes(d.id))
}

export function reorderDashboards(ids: string[]): void {
  const db = getDb()
  const stmt = db.prepare('UPDATE dashboards SET sort_order = ? WHERE id = ?')
  db.exec('BEGIN')
  try {
    ids.forEach((id, i) => stmt.run(i, id))
    db.exec('COMMIT')
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
}

export function getDashboard(id: string): Dashboard | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM dashboards WHERE id = ?').get(id) as Record<string, string> | undefined
  if (!row) return null

  const widgetRows = db
    .prepare('SELECT * FROM widgets WHERE dashboard_id = ? ORDER BY position')
    .all(id) as Array<{ id: string; type: string; layout: string; config: string; appearance: string | null; visibility: string | null }>

  const widgets: Widget[] = widgetRows.map((w) => ({
    id: w.id,
    type: w.type as Widget['type'],
    layout: JSON.parse(w.layout),
    config: JSON.parse(w.config),
    ...(w.appearance ? { appearance: JSON.parse(w.appearance) } : {}),
    ...(w.visibility ? { visibility: JSON.parse(w.visibility) } : {}),
  }))

  return {
    id: row.id,
    name: row.name,
    icon: normalizeOptionalString(row.icon) ?? undefined,
    background: normalizeOptionalString(row.background) ?? undefined,
    bg_opacity: row.bg_opacity != null ? Number(row.bg_opacity) : undefined,
    bg_size: normalizeOptionalString(row.bg_size) as Dashboard['bg_size'] ?? undefined,
    theme_override: normalizeOptionalString(row.theme_override) ?? undefined,
    is_default: Number(row.is_default) === 1,
    grid_config: row.grid_config ? JSON.parse(row.grid_config) : undefined,
    widgets,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export function createDashboard(data: { name: string; icon?: string; theme_override?: string }): Dashboard {
  const db = getDb()
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  db.prepare(`
    INSERT INTO dashboards (id, name, icon, background, theme_override, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.name, normalizeOptionalString(data.icon), null, normalizeOptionalString(data.theme_override), now, now)

  return {
    id,
    name: data.name,
    icon: normalizeOptionalString(data.icon) ?? undefined,
    theme_override: normalizeOptionalString(data.theme_override) ?? undefined,
    is_default: false,
    widgets: [],
    created_at: now,
    updated_at: now,
  }
}

export function saveDashboard(dashboard: Dashboard): void {
  const db = getDb()
  const now = new Date().toISOString()

  db.exec('BEGIN')
  try {
    const gridConfigJson = dashboard.grid_config && Object.keys(dashboard.grid_config).length > 0
      ? JSON.stringify(dashboard.grid_config) : null
    db.prepare(`UPDATE dashboards SET name=?, icon=?, background=?, bg_opacity=?, bg_size=?, theme_override=?, grid_config=?, updated_at=? WHERE id=?`)
      .run(
        dashboard.name,
        normalizeOptionalString(dashboard.icon),
        normalizeOptionalString(dashboard.background),
        dashboard.bg_opacity ?? null,
        normalizeOptionalString(dashboard.bg_size),
        normalizeOptionalString(dashboard.theme_override),
        gridConfigJson,
        now,
        dashboard.id,
      )

    db.prepare('DELETE FROM widgets WHERE dashboard_id = ?').run(dashboard.id)

    const insert = db.prepare(`
      INSERT INTO widgets (id, dashboard_id, type, layout, config, appearance, visibility, position) VALUES (?,?,?,?,?,?,?,?)
    `)

    dashboard.widgets.forEach((w, i) => {
      insert.run(
        w.id, dashboard.id, w.type,
        JSON.stringify(w.layout),
        JSON.stringify(w.config),
        w.appearance && Object.keys(w.appearance).length > 0 ? JSON.stringify(w.appearance) : null,
        w.visibility && Object.keys(w.visibility).length > 0 ? JSON.stringify(w.visibility) : null,
        i,
      )
    })
    db.exec('COMMIT')
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
}

export function deleteDashboard(id: string): boolean {
  const db = getDb()
  db.prepare('UPDATE users SET default_dashboard_id = NULL WHERE default_dashboard_id = ?').run(id)
  db.prepare('UPDATE users SET user_default_dashboard_id = NULL WHERE user_default_dashboard_id = ?').run(id)
  const result = db.prepare('DELETE FROM dashboards WHERE id = ?').run(id)
  return result.changes > 0
}

export function getGlobalDefaultDashboardId(): string | null {
  const db = getDb()
  const row = db.prepare('SELECT id FROM dashboards WHERE is_default = 1 ORDER BY sort_order ASC, created_at ASC LIMIT 1').get() as { id: string } | undefined
  return row?.id ?? null
}

export function setGlobalDefaultDashboard(dashboardId: string | null): void {
  const db = getDb()
  db.exec('BEGIN')
  try {
    db.prepare('UPDATE dashboards SET is_default = 0').run()
    if (dashboardId) db.prepare('UPDATE dashboards SET is_default = 1 WHERE id = ?').run(dashboardId)
    db.exec('COMMIT')
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
}

export function resolveDefaultDashboardForUserWithSource(userId?: string, role?: string): (DefaultDashboardResolution & { dashboard: DashboardListItem | null }) {
  const visibleDashboards = listDashboards(userId, role)
  if (visibleDashboards.length === 0) return { dashboardId: null, source: null, dashboard: null }

  if (userId) {
    const user = getUserById(userId)
    if (user?.user_default_dashboard_id) {
      const personalDefault = visibleDashboards.find(d => d.id === user.user_default_dashboard_id)
      if (personalDefault) return { dashboardId: personalDefault.id, source: 'user', dashboard: personalDefault }
    }
    if (user?.default_dashboard_id) {
      const userDefault = visibleDashboards.find(d => d.id === user.default_dashboard_id)
      if (userDefault) return { dashboardId: userDefault.id, source: 'admin', dashboard: userDefault }
    }
  }

  const globalDefaultId = getGlobalDefaultDashboardId()
  if (globalDefaultId) {
    const globalDefault = visibleDashboards.find(d => d.id === globalDefaultId)
    if (globalDefault) return { dashboardId: globalDefault.id, source: 'global', dashboard: globalDefault }
  }

  return { dashboardId: visibleDashboards[0]?.id ?? null, source: 'fallback', dashboard: visibleDashboards[0] ?? null }
}

export function resolveDefaultDashboardForUser(userId?: string, role?: string): DashboardListItem | null {
  return resolveDefaultDashboardForUserWithSource(userId, role).dashboard
}

export function listNotificationRules(): NotificationRule[] {
  const db = getDb()
  return db.prepare('SELECT * FROM notification_rules ORDER BY created_at ASC').all() as unknown as NotificationRule[]
}

export function createNotificationRule(data: Omit<NotificationRule, 'id' | 'created_at'>): NotificationRule {
  const db = getDb()
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  db.prepare(`INSERT INTO notification_rules (id, name, trigger_entity_id, trigger_state, action_type, action_entity_id, cooldown_seconds, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, data.name, data.trigger_entity_id, data.trigger_state, data.action_type, data.action_entity_id, data.cooldown_seconds, now)
  return { id, ...data, created_at: now }
}

export function updateNotificationRule(id: string, data: Omit<NotificationRule, 'id' | 'created_at'>): boolean {
  const db = getDb()
  const result = db.prepare(`UPDATE notification_rules SET name=?, trigger_entity_id=?, trigger_state=?, action_type=?, action_entity_id=?, cooldown_seconds=? WHERE id=?`)
    .run(data.name, data.trigger_entity_id, data.trigger_state, data.action_type, data.action_entity_id, data.cooldown_seconds, id)
  return result.changes > 0
}

export function deleteNotificationRule(id: string): boolean {
  const db = getDb()
  const result = db.prepare('DELETE FROM notification_rules WHERE id = ?').run(id)
  return result.changes > 0
}

// ── Notification Log ───────────────────────────────────────────────────────

export interface NotificationLogEntry {
  id: string
  rule_id: string
  rule_name: string
  entity_id: string
  entity_state: string
  triggered_at: string
}

export function addNotificationLog(entry: Omit<NotificationLogEntry, 'id'>): void {
  const db = getDb()
  db.prepare(`INSERT INTO notification_log (id, rule_id, rule_name, entity_id, entity_state, triggered_at)
    VALUES (?, ?, ?, ?, ?, ?)`)
    .run(crypto.randomUUID(), entry.rule_id, entry.rule_name, entry.entity_id, entry.entity_state, entry.triggered_at)
  // Keep only last 200 entries
  db.prepare(`DELETE FROM notification_log WHERE id NOT IN (SELECT id FROM notification_log ORDER BY triggered_at DESC LIMIT 200)`).run()
}

export function listNotificationLog(limit = 50): NotificationLogEntry[] {
  const db = getDb()
  return db.prepare('SELECT * FROM notification_log ORDER BY triggered_at DESC LIMIT ?').all(limit) as unknown as NotificationLogEntry[]
}

export function clearNotificationLog(): void {
  getDb().prepare('DELETE FROM notification_log').run()
}

// ── Users ──────────────────────────────────────────────────────────────────

export function countUsers(): number {
  const db = getDb()
  const row = db.prepare('SELECT COUNT(*) as n FROM users').get() as { n: number }
  return row.n
}

function parseDbUser(row: Record<string, unknown>): DbUser {
  return {
    ...(row as unknown as DbUser),
    force_kiosk: row.force_kiosk === 1 || row.force_kiosk === true,
    force_performance_mode: row.force_performance_mode == null ? null : (row.force_performance_mode === 1 || row.force_performance_mode === true),
    force_device_type: (row.force_device_type as string | null) ?? null,
    allowed_areas: row.allowed_areas ? JSON.parse(row.allowed_areas as string) : null,
  }
}

export function getUserByUsername(username: string): DbUser | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as Record<string, unknown> | undefined
  return row ? parseDbUser(row) : null
}

export function getUserByProviderId(provider: string, providerId: string): DbUser | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM users WHERE provider = ? AND provider_id = ?').get(provider, providerId) as Record<string, unknown> | undefined
  return row ? parseDbUser(row) : null
}

export function getUserById(id: string): DbUser | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Record<string, unknown> | undefined
  return row ? parseDbUser(row) : null
}

export function listUsers(): Omit<DbUser, 'password_hash'>[] {
  const db = getDb()
  const rows = db.prepare('SELECT id, username, email, role, force_kiosk, force_performance_mode, force_device_type, allowed_areas, provider, provider_id, default_dashboard_id, user_default_dashboard_id, created_at FROM users ORDER BY created_at ASC').all() as Record<string, unknown>[]
  return rows.map(r => parseDbUser(r) as Omit<DbUser, 'password_hash'>)
}

export function createUser(data: { username: string; email?: string; passwordHash?: string; role: 'admin' | 'editor' | 'user'; provider?: string; providerId?: string }): DbUser {
  const db = getDb()
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  db.prepare(`INSERT INTO users (id, username, email, password_hash, role, force_kiosk, force_performance_mode, force_device_type, allowed_areas, provider, provider_id, default_dashboard_id, user_default_dashboard_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, data.username, data.email ?? null, data.passwordHash ?? null, data.role, 0, null, null, null, data.provider ?? null, data.providerId ?? null, null, null, now)
  return {
    id,
    username: data.username,
    email: data.email ?? null,
    password_hash: data.passwordHash ?? null,
    role: data.role,
    force_kiosk: false,
    force_performance_mode: null,
    force_device_type: null,
    allowed_areas: null,
    provider: data.provider ?? null,
    provider_id: data.providerId ?? null,
    default_dashboard_id: null,
    user_default_dashboard_id: null,
    created_at: now,
  }
}

export function linkUserProvider(id: string, provider: string, providerId: string): boolean {
  const db = getDb()
  return db.prepare('UPDATE users SET provider = ?, provider_id = ? WHERE id = ?').run(provider, providerId, id).changes > 0
}

export function updateUserRole(id: string, role: 'admin' | 'editor' | 'user'): boolean {
  const db = getDb()
  return db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id).changes > 0
}

export function updateUserForceKiosk(id: string, forceKiosk: boolean): boolean {
  const db = getDb()
  return db.prepare('UPDATE users SET force_kiosk = ? WHERE id = ?').run(forceKiosk ? 1 : 0, id).changes > 0
}

export function updateUserForcePerformanceMode(id: string, value: boolean | null): boolean {
  const db = getDb()
  return db.prepare('UPDATE users SET force_performance_mode = ? WHERE id = ?').run(value == null ? null : (value ? 1 : 0), id).changes > 0
}

export function updateUserForceDeviceType(id: string, deviceType: string | null): boolean {
  const db = getDb()
  return db.prepare('UPDATE users SET force_device_type = ? WHERE id = ?').run(deviceType, id).changes > 0
}

export function updateUserAllowedAreas(id: string, areas: string[] | null): boolean {
  const db = getDb()
  return db.prepare('UPDATE users SET allowed_areas = ? WHERE id = ?').run(areas ? JSON.stringify(areas) : null, id).changes > 0
}

export function updateUserDefaultDashboard(id: string, defaultDashboardId: string | null): boolean {
  const db = getDb()
  return db.prepare('UPDATE users SET default_dashboard_id = ? WHERE id = ?').run(defaultDashboardId, id).changes > 0
}

export function updateUserPersonalDefaultDashboard(id: string, defaultDashboardId: string | null): boolean {
  const db = getDb()
  return db.prepare('UPDATE users SET user_default_dashboard_id = ? WHERE id = ?').run(defaultDashboardId, id).changes > 0
}

export function updateUserPassword(id: string, passwordHash: string): boolean {
  const db = getDb()
  return db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, id).changes > 0
}

export function deleteUser(id: string): boolean {
  const db = getDb()
  return db.prepare('DELETE FROM users WHERE id = ?').run(id).changes > 0
}

// ── Global Settings ────────────────────────────────────────────────────────

export function getGlobalSetting(key: string): string | null {
  const db = getDb()
  const row = db.prepare('SELECT value FROM global_settings WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value ?? null
}

export function setGlobalSetting(key: string, value: string | null): void {
  const db = getDb()
  if (value === null) {
    db.prepare('DELETE FROM global_settings WHERE key = ?').run(key)
  } else {
    db.prepare('INSERT INTO global_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value)
  }
}

export function getHomePageSettings(): { background?: string; bg_opacity?: number; bg_size?: string } {
  const background = getGlobalSetting('home_background')
  const bgOpacity = getGlobalSetting('home_bg_opacity')
  const bgSize = getGlobalSetting('home_bg_size')
  return {
    background: background ?? undefined,
    bg_opacity: bgOpacity != null ? Number(bgOpacity) : undefined,
    bg_size: bgSize ?? undefined,
  }
}
