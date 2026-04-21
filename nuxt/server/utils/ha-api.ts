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
  const res = await fetch(url, { headers: haHeaders(), cache: 'no-store' })
  if (!res.ok) throw new Error(`HA history error: ${res.status}`)
  return res.json()
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
