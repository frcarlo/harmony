import type { WidgetType } from '~/types/dashboard'

export const DEFAULT_IGNORED_OFFLINE_PLATFORMS = ['music_assistant', 'device_pulse', 'better_thermostat', 'fritz_profiles']
export const DEFAULT_IGNORED_OFFLINE_DOMAINS = ['button']

export const WIDGET_ENTITY_DOMAINS: Partial<Record<WidgetType, string | string[]>> = {
  sensor: ['sensor', 'binary_sensor'],
  gauge: ['sensor', 'number', 'input_number'],
  switch: 'switch',
  button: 'button',
  select: 'select',
  light: 'light',
  camera: 'camera',
  thermostat: 'climate',
  media_player: 'media_player',
  cover: 'cover',
  cover_dial: 'cover',
  cover_dial2: 'cover',
  lock: 'lock',
  weather: 'weather',
}
