function haHeaders(): HeadersInit {
  const config = useRuntimeConfig()
  return {
    Authorization: `Bearer ${config.haToken}`,
    'Content-Type': 'application/json',
  }
}

function haUrl(): string {
  return useRuntimeConfig().haUrl ?? 'http://localhost:8123'
}

export async function getHAHistory(entityId: string, startTime: string): Promise<unknown> {
  const params = new URLSearchParams({
    filter_entity_id: entityId,
    minimal_response: 'true',
    no_attributes: 'true',
  })
  const url = `${haUrl()}/api/history/period/${encodeURIComponent(startTime)}?${params}`
  const res = await fetch(url, { headers: haHeaders(), cache: 'no-store', signal: AbortSignal.timeout(30_000) })
  if (!res.ok) throw new Error(`HA history error: ${res.status}`)
  return res.json()
}

export async function getHAStatistics(
  entityId: string,
  startTime: string,
  period: 'hour' | 'day' | '5minute',
): Promise<Array<{ last_changed: string; state: string }>> {
  const url = `${haUrl()}/api/statistics_during_period`
  const res = await fetch(url, {
    method: 'POST',
    headers: haHeaders(),
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({ start_time: startTime, statistic_ids: [entityId], period, types: ['mean', 'sum', 'state'] }),
  })
  if (!res.ok) return []
  const data = await res.json() as Record<string, Array<{ start: string; mean?: number | null; sum?: number | null; state?: number | null }>>
  const entries = data[entityId] ?? []
  return entries.map(e => ({
    last_changed: e.start,
    state: String(e.mean ?? e.state ?? e.sum ?? 0),
  })).filter(e => e.state !== 'null' && e.state !== '0' || true)
}

export function downsampleHistory(
  points: Array<{ last_changed: string; state: string }>,
  maxPoints: number,
): Array<{ last_changed: string; state: string }> {
  if (points.length <= maxPoints) return points
  const bucketSize = points.length / maxPoints
  const result: Array<{ last_changed: string; state: string }> = []
  for (let i = 0; i < maxPoints; i++) {
    const start = Math.floor(i * bucketSize)
    const end = Math.min(Math.floor((i + 1) * bucketSize), points.length)
    const bucket = points.slice(start, end)
    const numeric = bucket.map(p => parseFloat(p.state)).filter(v => !isNaN(v))
    if (numeric.length === 0) continue
    const avg = numeric.reduce((s, v) => s + v, 0) / numeric.length
    result.push({ last_changed: bucket[Math.floor(bucket.length / 2)].last_changed, state: String(avg) })
  }
  return result
}

export async function getWeatherForecast(entityId: string, type = 'daily'): Promise<unknown> {
  const url = `${haUrl()}/api/services/weather/get_forecasts?return_response=true`
  const res = await fetch(url, {
    method: 'POST',
    headers: haHeaders(),
    body: JSON.stringify({ entity_id: entityId, type }),
  })




  if (!res.ok) throw new Error(`HA weather forecast error: ${res.status}`)

  let json = await res.json()
  //try { json = JSON.parse(text) } catch { throw new Error(`HA weather forecast parse error: ${text.slice(0, 200)}`) }

  // Format 1: { "weather.xxx": { "forecast": [...] } }
  if (json?.service_response && typeof json?.service_response === 'object' && !Array.isArray(json.service_response)) {
    const obj = json?.service_response as Record<string, unknown>
    const key = Object.keys(obj).find(k => k.toLowerCase() === entityId.toLowerCase())
    if (key) {
      const val = obj[key] as Record<string, unknown>
      if (Array.isArray(val?.forecast)) return val.forecast
      if (Array.isArray(val)) return val
    }
    // Format 2: flat object with forecast key
    if (Array.isArray((obj as any).forecast)) return (obj as any).forecast
  }

  // Format 3: direct array
  if (Array.isArray(json)) return json

  throw new Error(`Unbekanntes Forecast-Format: ${JSON.stringify(json).slice(0, 200)}`)
}

export async function getHACalendarEvents(entityId: string, start: string, end: string): Promise<unknown> {
  const params = new URLSearchParams({ start, end })
  const url = `${haUrl()}/api/calendars/${encodeURIComponent(entityId)}?${params}`
  const res = await fetch(url, { headers: haHeaders(), cache: 'no-store' })
  if (!res.ok) throw new Error(`HA calendar error: ${res.status}`)
  return res.json()
}

export async function getCameraSnapshot(entityId: string): Promise<Response> {
  const url = `${haUrl()}/api/camera_proxy/${entityId}`
  return fetch(url, { headers: haHeaders(), cache: 'no-store' })
}

export async function getHAImageProxy(path: string): Promise<Response> {
  const url = path.startsWith('http') ? path : `${haUrl()}${path}`
  return fetch(url, { headers: haHeaders(), cache: 'no-store' })
}
