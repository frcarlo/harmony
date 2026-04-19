import { DatabaseSync } from 'node:sqlite'
import path from 'path'
import fs from 'fs'
import type { Dashboard, Widget, DashboardListItem, NotificationRule } from '~/types/dashboard'

export interface DbUser {
  id: string
  username: string
  email: string | null
  password_hash: string | null
  role: 'admin' | 'user'
  provider: string | null
  provider_id: string | null
  created_at: string
}

let _db: DatabaseSync | null = null

function getDb(): DatabaseSync {
  if (_db) return _db

  const config = useRuntimeConfig()
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
      provider TEXT,
      provider_id TEXT,
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
  `)

  // Migrations
  const widgetCols = _db.prepare('PRAGMA table_info(widgets)').all() as Array<{ name: string }>
  if (!widgetCols.some((c) => c.name === 'appearance')) {
    _db.exec('ALTER TABLE widgets ADD COLUMN appearance TEXT')
  }
  const dashCols = _db.prepare('PRAGMA table_info(dashboards)').all() as Array<{ name: string }>
  if (!dashCols.some((c) => c.name === 'sort_order')) {
    _db.exec('ALTER TABLE dashboards ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0')
    _db.exec('UPDATE dashboards SET sort_order = rowid')
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
  return db.prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?').all(limit) as AuditLogEntry[]
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
  const all = db.prepare('SELECT * FROM dashboards ORDER BY sort_order ASC, created_at ASC').all() as DashboardListItem[]
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
    .all(id) as Array<{ id: string; type: string; layout: string; config: string; appearance: string | null }>

  const widgets: Widget[] = widgetRows.map((w) => ({
    id: w.id,
    type: w.type as Widget['type'],
    layout: JSON.parse(w.layout),
    config: JSON.parse(w.config),
    ...(w.appearance ? { appearance: JSON.parse(w.appearance) } : {}),
  }))

  return {
    id: row.id,
    name: row.name,
    icon: row.icon ?? undefined,
    background: row.background ?? undefined,
    widgets,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export function createDashboard(data: { name: string; icon?: string }): Dashboard {
  const db = getDb()
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  db.prepare(`
    INSERT INTO dashboards (id, name, icon, background, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, data.name, data.icon ?? null, null, now, now)

  return { id, name: data.name, icon: data.icon, widgets: [], created_at: now, updated_at: now }
}

export function saveDashboard(dashboard: Dashboard): void {
  const db = getDb()
  const now = new Date().toISOString()

  db.exec('BEGIN')
  try {
    db.prepare(`UPDATE dashboards SET name=?, icon=?, background=?, updated_at=? WHERE id=?`)
      .run(dashboard.name, dashboard.icon ?? null, dashboard.background ?? null, now, dashboard.id)

    db.prepare('DELETE FROM widgets WHERE dashboard_id = ?').run(dashboard.id)

    const insert = db.prepare(`
      INSERT INTO widgets (id, dashboard_id, type, layout, config, appearance, position) VALUES (?,?,?,?,?,?,?)
    `)

    dashboard.widgets.forEach((w, i) => {
      insert.run(
        w.id, dashboard.id, w.type,
        JSON.stringify(w.layout),
        JSON.stringify(w.config),
        w.appearance && Object.keys(w.appearance).length > 0 ? JSON.stringify(w.appearance) : null,
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
  const result = db.prepare('DELETE FROM dashboards WHERE id = ?').run(id)
  return result.changes > 0
}

export function listNotificationRules(): NotificationRule[] {
  const db = getDb()
  return db.prepare('SELECT * FROM notification_rules ORDER BY created_at ASC').all() as NotificationRule[]
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
  return db.prepare('SELECT * FROM notification_log ORDER BY triggered_at DESC LIMIT ?').all(limit) as NotificationLogEntry[]
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

export function getUserByUsername(username: string): DbUser | null {
  const db = getDb()
  return (db.prepare('SELECT * FROM users WHERE username = ?').get(username) as DbUser) ?? null
}

export function getUserByProviderId(provider: string, providerId: string): DbUser | null {
  const db = getDb()
  return (db.prepare('SELECT * FROM users WHERE provider = ? AND provider_id = ?').get(provider, providerId) as DbUser) ?? null
}

export function getUserById(id: string): DbUser | null {
  const db = getDb()
  return (db.prepare('SELECT * FROM users WHERE id = ?').get(id) as DbUser) ?? null
}

export function listUsers(): Omit<DbUser, 'password_hash'>[] {
  const db = getDb()
  return db.prepare('SELECT id, username, email, role, provider, provider_id, created_at FROM users ORDER BY created_at ASC').all() as Omit<DbUser, 'password_hash'>[]
}

export function createUser(data: { username: string; email?: string; passwordHash?: string; role: 'admin' | 'user'; provider?: string; providerId?: string }): DbUser {
  const db = getDb()
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  db.prepare(`INSERT INTO users (id, username, email, password_hash, role, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, data.username, data.email ?? null, data.passwordHash ?? null, data.role, data.provider ?? null, data.providerId ?? null, now)
  return { id, username: data.username, email: data.email ?? null, password_hash: data.passwordHash ?? null, role: data.role, provider: data.provider ?? null, provider_id: data.providerId ?? null, created_at: now }
}

export function updateUserRole(id: string, role: 'admin' | 'user'): boolean {
  const db = getDb()
  return db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id).changes > 0
}

export function deleteUser(id: string): boolean {
  const db = getDb()
  return db.prepare('DELETE FROM users WHERE id = ?').run(id).changes > 0
}
