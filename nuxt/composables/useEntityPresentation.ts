import type { HAState } from '~/types/ha'

type MinimalEntity = Pick<HAState, 'entity_id' | 'state' | 'attributes'>

const BINARY_SENSOR_ICONS: Record<string, [string, string]> = {
  battery: ['mdi-battery-alert-variant-outline', 'mdi-battery-check-outline'],
  cold: ['mdi-snowflake-alert', 'mdi-snowflake'],
  connectivity: ['mdi-lan-disconnect', 'mdi-lan-connect'],
  door: ['mdi-door-open', 'mdi-door-closed'],
  garage_door: ['mdi-garage-open-variant', 'mdi-garage-variant'],
  gas: ['mdi-gas-cylinder', 'mdi-gas-cylinder'],
  heat: ['mdi-fire-alert', 'mdi-fire'],
  light: ['mdi-brightness-7', 'mdi-brightness-5'],
  lock: ['mdi-lock-open-alert-outline', 'mdi-lock-check-outline'],
  moisture: ['mdi-water-alert-outline', 'mdi-water-check-outline'],
  motion: ['mdi-motion-sensor', 'mdi-motion-sensor-off'],
  occupancy: ['mdi-account-check', 'mdi-account-outline'],
  opening: ['mdi-door-open', 'mdi-door-closed'],
  plug: ['mdi-power-plug', 'mdi-power-plug-off-outline'],
  power: ['mdi-power-plug', 'mdi-power-plug-off-outline'],
  presence: ['mdi-home-account', 'mdi-home-outline'],
  problem: ['mdi-alert-circle-outline', 'mdi-check-circle-outline'],
  safety: ['mdi-shield-alert-outline', 'mdi-shield-check-outline'],
  smoke: ['mdi-smoke-detector-alert', 'mdi-smoke-detector-outline'],
  sound: ['mdi-volume-high', 'mdi-volume-off'],
  tamper: ['mdi-shield-alert-outline', 'mdi-shield-check-outline'],
  vibration: ['mdi-vibrate', 'mdi-vibrate-off'],
  window: ['mdi-window-open-variant', 'mdi-window-closed-variant'],
}

const SENSOR_ICONS: Record<string, string> = {
  apparent_power: 'mdi-flash-triangle-outline',
  atmospheric_pressure: 'mdi-gauge',
  battery: 'mdi-battery',
  carbon_dioxide: 'mdi-molecule-co2',
  carbon_monoxide: 'mdi-molecule-co',
  current: 'mdi-current-ac',
  data_rate: 'mdi-speedometer',
  data_size: 'mdi-database',
  distance: 'mdi-ruler',
  duration: 'mdi-timer-outline',
  energy: 'mdi-lightning-bolt',
  frequency: 'mdi-sine-wave',
  gas: 'mdi-gas-cylinder',
  humidity: 'mdi-water-percent',
  illuminance: 'mdi-brightness-5',
  irradiance: 'mdi-solar-power-variant-outline',
  moisture: 'mdi-water-percent',
  monetary: 'mdi-cash',
  nitrogen_dioxide: 'mdi-molecule',
  nitrogen_monoxide: 'mdi-molecule',
  nitrous_oxide: 'mdi-molecule',
  ozone: 'mdi-molecule',
  ph: 'mdi-flask-outline',
  pm1: 'mdi-air-filter',
  pm10: 'mdi-air-filter',
  pm25: 'mdi-air-filter',
  power: 'mdi-flash',
  power_factor: 'mdi-angle-acute',
  precipitation: 'mdi-weather-rainy',
  precipitation_intensity: 'mdi-weather-pouring',
  pressure: 'mdi-gauge',
  reactive_power: 'mdi-flash-triangle',
  signal_strength: 'mdi-wifi-strength-3',
  sound_pressure: 'mdi-volume-high',
  speed: 'mdi-speedometer',
  sulphur_dioxide: 'mdi-molecule',
  temperature: 'mdi-thermometer',
  volatile_organic_compounds: 'mdi-air-filter',
  volatile_organic_compounds_parts: 'mdi-air-filter',
  voltage: 'mdi-sine-wave',
  volume: 'mdi-cube-outline',
  volume_storage: 'mdi-database',
  water: 'mdi-water',
  weight: 'mdi-weight',
  wind_speed: 'mdi-weather-windy',
}

function domainOf(entityOrId: MinimalEntity | string) {
  const entityId = typeof entityOrId === 'string' ? entityOrId : entityOrId.entity_id
  return entityId.split('.')[0] ?? ''
}

function deviceClassOf(entity?: MinimalEntity) {
  return entity?.attributes?.device_class as string | undefined
}

function stateOf(entity?: MinimalEntity, active = false) {
  return entity?.state ?? (active ? 'on' : 'off')
}

function isActive(entityOrId: MinimalEntity | string | undefined, activeState?: string) {
  if (!entityOrId) return false
  const entity = typeof entityOrId === 'string' ? undefined : entityOrId
  const entityId = typeof entityOrId === 'string' ? entityOrId : entityOrId.entity_id
  const state = stateOf(entity)
  if (activeState) return state === activeState

  const domain = domainOf(entityId)
  if (domain === 'lock') return state === 'locked'
  if (domain === 'cover') return ['open', 'opening'].includes(state)
  if (domain === 'media_player') return state === 'playing'
  if (domain === 'climate') return !!state && !['off', 'unavailable', 'unknown'].includes(state)
  if (domain === 'alarm_control_panel') return ['triggered', 'pending', 'arming', 'armed_home', 'armed_away', 'armed_night'].includes(state)
  return state === 'on'
}

function entityLabel(entityOrId: MinimalEntity | string | undefined, fallback = '') {
  if (!entityOrId) return fallback
  if (typeof entityOrId === 'string') return fallback || entityOrId
  return (entityOrId.attributes.friendly_name as string | undefined) ?? fallback ?? entityOrId.entity_id
}

function binarySensorIcon(entity: MinimalEntity | undefined, active: boolean) {
  const pair = BINARY_SENSOR_ICONS[deviceClassOf(entity) ?? '']
  if (pair) return active ? pair[0] : pair[1]
  return active ? 'mdi-checkbox-marked-circle-outline' : 'mdi-checkbox-blank-circle-outline'
}

function sensorIcon(entity: MinimalEntity | undefined) {
  const deviceClass = deviceClassOf(entity)
  if (deviceClass && SENSOR_ICONS[deviceClass]) return SENSOR_ICONS[deviceClass]

  const unit = entity?.attributes?.unit_of_measurement as string | undefined
  if (unit === '%') return 'mdi-percent-outline'
  if (unit === '°C' || unit === '°F') return 'mdi-thermometer'
  if (unit === 'W' || unit === 'kW') return 'mdi-flash'
  if (unit === 'Wh' || unit === 'kWh') return 'mdi-lightning-bolt'
  return 'mdi-gauge'
}

function domainIcon(entityOrId: MinimalEntity | string | undefined, active = false) {
  const entity = typeof entityOrId === 'string' ? undefined : entityOrId
  const entityId = typeof entityOrId === 'string' ? entityOrId : entityOrId?.entity_id ?? ''
  const domain = domainOf(entityId)

  if (domain === 'alarm_control_panel') return active ? 'mdi-shield-alert' : 'mdi-shield-home-outline'
  if (domain === 'automation') return active ? 'mdi-robot' : 'mdi-robot-off-outline'
  if (domain === 'binary_sensor') return binarySensorIcon(entity, active)
  if (domain === 'button' || domain === 'input_button') return 'mdi-gesture-tap-button'
  if (domain === 'camera') return active ? 'mdi-camera' : 'mdi-camera-off-outline'
  if (domain === 'climate') return active ? 'mdi-thermostat' : 'mdi-thermostat-off'
  if (domain === 'cover') return active ? 'mdi-window-shutter-open' : 'mdi-window-shutter'
  if (domain === 'fan') return active ? 'mdi-fan' : 'mdi-fan-off'
  if (domain === 'humidifier') return active ? 'mdi-air-humidifier' : 'mdi-air-humidifier-off'
  if (domain === 'input_boolean') return active ? 'mdi-toggle-switch' : 'mdi-toggle-switch-off-outline'
  if (domain === 'light') return active ? 'mdi-lightbulb' : 'mdi-lightbulb-outline'
  if (domain === 'lock') return active ? 'mdi-lock' : 'mdi-lock-open-outline'
  if (domain === 'media_player') return active ? 'mdi-play-circle' : 'mdi-pause-circle-outline'
  if (domain === 'person') return active ? 'mdi-account' : 'mdi-account-outline'
  if (domain === 'remote') return active ? 'mdi-remote' : 'mdi-remote-off'
  if (domain === 'script') return 'mdi-script-text-outline'
  if (domain === 'select' || domain === 'input_select') return 'mdi-form-dropdown'
  if (domain === 'sensor') return sensorIcon(entity)
  if (domain === 'siren') return active ? 'mdi-bullhorn' : 'mdi-bullhorn-outline'
  if (domain === 'sun') return active ? 'mdi-weather-sunny' : 'mdi-weather-night'
  if (domain === 'switch') {
    if (deviceClassOf(entity) === 'outlet') return active ? 'mdi-power-plug' : 'mdi-power-plug-off-outline'
    return active ? 'mdi-toggle-switch' : 'mdi-toggle-switch-off-outline'
  }
  if (domain === 'update') return active ? 'mdi-package-up' : 'mdi-package-check'
  if (domain === 'vacuum') return active ? 'mdi-robot-vacuum' : 'mdi-robot-vacuum-off'
  if (domain === 'weather') return 'mdi-weather-partly-cloudy'
  return active ? 'mdi-circle' : 'mdi-circle-outline'
}

function stateColor(entityOrId: MinimalEntity | string | undefined, active = false) {
  const domain = domainOf(entityOrId ?? '')
  if (!active) return 'medium-emphasis'
  if (domain === 'binary_sensor') {
    const deviceClass = typeof entityOrId === 'string' ? undefined : deviceClassOf(entityOrId)
    if (['battery', 'problem', 'safety', 'smoke', 'moisture', 'gas', 'heat', 'tamper'].includes(deviceClass ?? '')) return 'error'
    if (['door', 'window', 'garage_door', 'opening'].includes(deviceClass ?? '')) return 'warning'
  }
  if (domain === 'light') return 'warning'
  if (domain === 'update') return 'info'
  if (domain === 'alarm_control_panel') return 'error'
  return 'primary'
}

export function useEntityPresentation() {
  return {
    autoEntityIcon: domainIcon,
    autoEntityLabel: entityLabel,
    entityIsActive: isActive,
    entityStateColor: stateColor,
  }
}
