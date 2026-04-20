export type WidgetType =
  | 'sensor'
  | 'switch'
  | 'light'
  | 'chart'
  | 'camera'
  | 'thermostat'
  | 'media_player'
  | 'cover'
  | 'cover_dial'
  | 'cover_dial2'
  | 'lock'
  | 'weather'
  | 'clock'
  | 'label'
  | 'room_card'
  | 'calendar'
  | 'person'
  | 'energy'
  | 'status_bar'

export interface WidgetLayout {
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
}

export interface SensorWidgetConfig {
  entity_id: string
  name?: string
  unit?: string
  decimal_places?: number
  alert_below?: number
  alert_above?: number
}

export interface SwitchWidgetConfig {
  entity_id: string
  name?: string
}

export interface LightWidgetConfig {
  entity_id: string
  name?: string
  show_brightness?: boolean
}

export interface ChartWidgetConfig {
  entity_id: string
  name?: string
  period?: '1h' | '6h' | '24h' | '7d' | '30d'
  chart_type?: 'line' | 'area' | 'bar'
  color?: string
  area_color?: string
  unit?: string
}

export interface CameraWidgetConfig {
  entity_id: string
  name?: string
  refresh_interval?: number
}

export interface ThermostatWidgetConfig {
  entity_id: string
  name?: string
}

export interface MediaPlayerWidgetConfig {
  entity_id: string
  name?: string
  show_album_art?: boolean
}

export interface CoverWidgetConfig {
  entity_id: string
  name?: string
  dial_color?: string
  dial_bg_color?: string
  buttons_position?: 'left' | 'right' | 'top' | 'bottom'
}

export interface LockWidgetConfig {
  entity_id: string
  name?: string
  require_confirmation?: boolean
  door_sensor_entity?: string
  show_door_button?: boolean
}

export interface WeatherWidgetConfig {
  entity_id: string
  name?: string
  show_forecast?: boolean
  forecast_rows?: number
}

export interface ClockWidgetConfig {
  timezone?: string
  format_24h?: boolean
  show_date?: boolean
}

export interface LabelWidgetConfig {
  text: string
  font_size?: 'sm' | 'md' | 'lg' | 'xl'
}

export interface CalendarWidgetConfig {
  entity_id: string
  name?: string
  show_time?: boolean
  days?: number
}

export interface RoomCardStatusEntity {
  entity_id: string
  icon: string
  active_state?: string
  active_color?: string
  inactive_color?: string
  [key: string]: unknown
}

export interface RoomCardWidgetConfig {
  name: string
  climate_entity?: string
  show_temp_control?: boolean
  light_entity?: string
  sensor_entity?: string
  sensor_icon?: string
  status_entities?: RoomCardStatusEntity[]
}

export interface PersonEntry {
  entity_id: string
  name?: string
}

export interface PersonWidgetConfig {
  persons: PersonEntry[]
  name?: string
}

export interface StatusBarEntry {
  entity_id: string
  icon: string
  label?: string
  active_state?: string
  active_color?: string
  inactive_color?: string
}

export interface StatusBarWidgetConfig {
  entries: StatusBarEntry[]
  show_labels?: boolean
}

export interface EnergyWidgetConfig {
  grid_entity_id?: string
  solar_entity_id?: string
  battery_entity_id?: string
  name?: string
}

export type WidgetConfig =
  | SensorWidgetConfig
  | SwitchWidgetConfig
  | LightWidgetConfig
  | ChartWidgetConfig
  | CameraWidgetConfig
  | ThermostatWidgetConfig
  | MediaPlayerWidgetConfig
  | CoverWidgetConfig
  | LockWidgetConfig
  | WeatherWidgetConfig
  | ClockWidgetConfig
  | LabelWidgetConfig
  | RoomCardWidgetConfig
  | CalendarWidgetConfig
  | PersonWidgetConfig
  | EnergyWidgetConfig
  | StatusBarWidgetConfig

export interface WidgetAppearance {
  bg_color?: string        // Hintergrundfarbe der Karte
  border_color?: string    // Rahmenfarbe (Standard)
  active_color?: string    // Rahmenfarbe wenn Entity aktiv (on/open/playing…)
  border_width?: number    // Rahmenstärke in px (0–8)
  text_color?: string      // Textfarbe Override
  min_width?: number       // Minimale Breite in px
}

export interface Widget {
  id: string
  type: WidgetType
  layout: WidgetLayout
  config: WidgetConfig
  appearance?: WidgetAppearance
}

export interface GridConfig {
  columns?: number
  cell_height?: number
  margin?: number
  breakpoints?: boolean
  max_width?: number
}

export interface Dashboard {
  id: string
  name: string
  icon?: string
  background?: string
  grid_config?: GridConfig
  widgets: Widget[]
  created_at: string
  updated_at: string
}

export type DashboardListItem = Omit<Dashboard, 'widgets'>

export interface NotificationRule {
  id: string
  name: string
  trigger_entity_id: string
  trigger_state: string
  action_type: 'camera' | 'entity'
  action_entity_id: string
  cooldown_seconds: number
  created_at: string
}
