import { getHAEnergyStats } from '~/server/utils/ha-api'

type PeriodKey = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month'

// TTLs in ms — completed periods cached much longer since data won't change
const CACHE_TTL: Record<PeriodKey, number> = {
  today: 5 * 60_000,          // 5 min
  yesterday: 3600_000,        // 1 h (completed day)
  this_week: 30 * 60_000,     // 30 min
  this_month: 60 * 60_000,    // 1 h
  last_week: 12 * 3600_000,   // 12 h
  last_month: 12 * 3600_000,  // 12 h
}

const energyCache = new Map<string, { data: unknown; expires: number }>()

interface DataPoint {
  label: string
  kwh: number
}

interface EntityResult {
  total_kwh: number
  granularity: 'hour' | 'day'
  daily: DataPoint[]
}

// Returns timezone offset in minutes (positive = east of UTC, e.g. UTC+2 → +120)
function getOffsetMinutes(d: Date, tz: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(d)
    const tzName = parts.find(p => p.type === 'timeZoneName')?.value ?? 'GMT'
    const m = tzName.match(/GMT([+-])(\d+)(?::(\d+))?/)
    if (!m) return 0
    return (m[1] === '+' ? 1 : -1) * (parseInt(m[2]) * 60 + parseInt(m[3] ?? '0'))
  }
  catch { return 0 }
}

// Returns the UTC Date that corresponds to midnight on the given local calendar date
function localMidnightUTC(year: number, month: number, day: number, tz: string): Date {
  // Sample the offset at noon on that day (avoids DST-at-midnight edge cases)
  const offsetMs = getOffsetMinutes(new Date(Date.UTC(year, month - 1, day, 12, 0, 0)), tz) * 60_000
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - offsetMs)
}

function getLocalDateParts(d: Date, tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short',
  }).formatToParts(d)
  const get = (t: string) => parseInt(parts.find(p => p.type === t)?.value ?? '0')
  const weekdayStr = parts.find(p => p.type === 'weekday')?.value ?? 'Mon'
  const weekdays: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return { year: get('year'), month: get('month'), day: get('day'), weekday: weekdays[weekdayStr] ?? 1 }
}

function getPeriodBounds(period: PeriodKey, timezone: string) {
  const now = new Date()
  const ld = getLocalDateParts(now, timezone)
  const todayMidnight = localMidnightUTC(ld.year, ld.month, ld.day, timezone)

  // Always fetch 1 extra day before the period so we have a baseline reading
  // (energy sensors are cumulative counters — consumption = last - first)

  if (period === 'today') {
    const baseline = new Date(todayMidnight.getTime() - 86_400_000)
    return { start: baseline, periodStart: todayMidnight, end: now, hourly: true }
  }

  if (period === 'yesterday') {
    const yesterdayMidnight = new Date(todayMidnight.getTime() - 86_400_000)
    const baseline = new Date(yesterdayMidnight.getTime() - 86_400_000)
    return { start: baseline, periodStart: yesterdayMidnight, end: todayMidnight, hourly: true }
  }

  if (period === 'this_week') {
    const daysFromMonday = (ld.weekday + 6) % 7
    const monday = new Date(todayMidnight.getTime() - daysFromMonday * 86_400_000)
    const baseline = new Date(monday.getTime() - 86_400_000)
    return { start: baseline, periodStart: monday, end: now, hourly: false }
  }

  if (period === 'last_week') {
    const daysFromMonday = (ld.weekday + 6) % 7
    const thisMonday = new Date(todayMidnight.getTime() - daysFromMonday * 86_400_000)
    const lastMonday = new Date(thisMonday.getTime() - 7 * 86_400_000)
    const baseline = new Date(lastMonday.getTime() - 86_400_000)
    const end = new Date(thisMonday.getTime() - 1)
    return { start: baseline, periodStart: lastMonday, end, hourly: false }
  }

  if (period === 'this_month') {
    const firstDay = localMidnightUTC(ld.year, ld.month, 1, timezone)
    const baseline = new Date(firstDay.getTime() - 86_400_000)
    return { start: baseline, periodStart: firstDay, end: now, hourly: false }
  }

  if (period === 'last_month') {
    const lastMonthYear = ld.month === 1 ? ld.year - 1 : ld.year
    const lastMonth = ld.month === 1 ? 12 : ld.month - 1
    const firstDay = localMidnightUTC(lastMonthYear, lastMonth, 1, timezone)
    const thisFirst = localMidnightUTC(ld.year, ld.month, 1, timezone)
    const baseline = new Date(firstDay.getTime() - 86_400_000)
    const end = new Date(thisFirst.getTime() - 1)
    return { start: baseline, periodStart: firstDay, end, hourly: false }
  }

  return { start: todayMidnight, periodStart: todayMidnight, end: now, hourly: true }
}

function toLocalDateStr(isoStr: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(isoStr))
}

function toLocalHourStr(isoStr: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(isoStr))
}

function computeFromHistory(
  points: Array<{ start: string; sum: number }>,
  periodStart: Date,
  timezone: string,
  hourly: boolean,
): EntityResult {
  if (points.length === 0) return { total_kwh: 0, granularity: hourly ? 'hour' : 'day', daily: [] }

  const periodStartMs = periodStart.getTime()
  const baselinePoints = points.filter(p => new Date(p.start).getTime() < periodStartMs)
  const periodPoints = points.filter(p => new Date(p.start).getTime() >= periodStartMs)
  const baseline = baselinePoints.length > 0 ? baselinePoints[baselinePoints.length - 1].sum : points[0].sum

  if (periodPoints.length === 0) return { total_kwh: 0, granularity: hourly ? 'hour' : 'day', daily: [] }

  const total_kwh = Math.max(0, periodPoints[periodPoints.length - 1].sum - baseline)

  // Build breakdown — hourly or daily buckets
  // Map: label → last sum in that bucket
  const bucketMap = new Map<string, number>()
  const labelFn = hourly
    ? (iso: string) => toLocalHourStr(iso, timezone)
    : (iso: string) => toLocalDateStr(iso, timezone)

  for (const pt of points) {
    bucketMap.set(labelFn(pt.start), pt.sum)
  }

  const sortedLabels = Array.from(bucketMap.keys()).sort()
  const periodStartLabel = hourly
    ? toLocalHourStr(periodStart.toISOString(), timezone)
    : toLocalDateStr(periodStart.toISOString(), timezone)

  const daily: DataPoint[] = []
  for (let i = 0; i < sortedLabels.length; i++) {
    const label = sortedLabels[i]
    if (label < periodStartLabel) continue
    const currentSum = bucketMap.get(label)!
    const prevSum = i > 0 ? bucketMap.get(sortedLabels[i - 1])! : baseline
    const kwh = Math.max(0, currentSum - prevSum)
    daily.push({ label, kwh: Math.round(kwh * 1000) / 1000 })
  }

  return { total_kwh: Math.round(total_kwh * 1000) / 1000, granularity: hourly ? 'hour' : 'day', daily }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const entityIdsRaw = query.entityIds as string
  const period = (query.period as PeriodKey) ?? 'today'
  const timezone = (query.timezone as string) ?? 'UTC'

  if (!entityIdsRaw) throw createError({ statusCode: 400, message: 'entityIds required' })

  const entityIds = entityIdsRaw.split(',').map(s => s.trim()).filter(Boolean)

  // Cache key includes the local date so cache auto-invalidates at midnight
  const localDate = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date())
  const cacheKey = `${entityIds.join(',')}:${period}:${localDate}`
  const now = Date.now()

  const cached = energyCache.get(cacheKey)
  if (cached && cached.expires > now) return cached.data

  const { start, periodStart, end, hourly } = getPeriodBounds(period, timezone)

  const results = await Promise.all(
    entityIds.map(async (entityId) => {
      const points = await getHAEnergyStats(entityId, start.toISOString(), end.toISOString())
      return [entityId, computeFromHistory(points, periodStart, timezone, hourly)] as const
    }),
  )

  const data = Object.fromEntries(results) as Record<string, EntityResult>
  energyCache.set(cacheKey, { data, expires: now + CACHE_TTL[period] })

  return data
})
