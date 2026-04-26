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
  | 'calendar_v2'
  | 'person'
  | 'energy'
  | 'appliance'
  | 'alarm'
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
  show_trend?: boolean
}

export interface SwitchWidgetConfig {
  entity_id: string
  name?: string
  icon?: string
  sensor_entity_id?: string
  show_sensor_trend?: boolean
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
  buttons_size?: 'x-small' | 'small' | 'default' | 'large'
  compact?: boolean
  open_color?: string
  closed_color?: string
}

export interface LockWidgetConfig {
  entity_id: string
  name?: string
  lock_type?: 'lock' | 'gate'
  locked_icon?: string
  unlocked_icon?: string
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
  show_seconds?: boolean
  style?: 'default' | 'led'
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

export interface CalendarV2WidgetConfig {
  calendars: string[]
  name?: string
  view?: 'day' | 'week' | 'month'
  calendar_colors?: string[]
}

export interface RoomCardStatusEntity {
  entity_id: string
  icon: string
  active_state?: string
  active_color?: string
  inactive_color?: string
  [key: string]: unknown
}

export interface RoomCardSensorEntity {
  entity_id: string
  icon?: string
}

export interface RoomCardWidgetConfig {
  name: string
  climate_entity?: string
  show_temp_control?: boolean
  light_entity?: string
  sensor_entity?: string
  sensor_icon?: string
  sensor_entities?: RoomCardSensorEntity[]
  status_entities?: RoomCardStatusEntity[]
  card_click_action?: 'none' | 'toggle_light' | 'open_light_detail' | 'open_climate_detail'
  card_double_click_action?: 'none' | 'toggle_light' | 'open_light_detail' | 'open_climate_detail'
  card_hold_action?: 'none' | 'toggle_light' | 'open_light_detail' | 'open_climate_detail'
}

export interface PersonEntry {
  entity_id: string
  name?: string
}

export interface PersonWidgetConfig {
  persons: PersonEntry[]
  name?: string
}

export interface EntityGroupFilter {
  domains?: string[]
  name_contains?: string
  name_starts_with?: string
  areas?: string[]
  labels?: string[]
  exclude_groups?: boolean
}

export interface StatusBarEntry {
  entry_type?: 'single'
  entity_id: string
  icon: string
  inactive_icon?: string
  label?: string
  active_state?: string
  active_color?: string
  inactive_color?: string
  icon_size?: 'sm' | 'md' | 'lg'
}

export interface StatusBarGroupEntry {
  entry_type: 'group'
  icon: string
  label?: string
  filter: EntityGroupFilter
  show_badge?: boolean
  active_color?: string
  inactive_color?: string
  icon_size?: 'sm' | 'md' | 'lg'
}

export interface StatusBarNavEntry {
  entry_type: 'nav'
  icon: string
  label?: string
  dashboard_id: string
  icon_color?: string
  icon_size?: 'sm' | 'md' | 'lg'
}

export interface StatusBarRoomEntry {
  entry_type: 'room'
  icon: string
  label?: string
  light_entity?: string
  climate_entity?: string
  sensor_entity?: string
  sensor_icon?: string
  sensor_entities?: RoomCardSensorEntity[]
  status_entities?: RoomCardStatusEntity[]
  active_source?: 'light' | 'climate' | 'custom'
  active_entity_id?: string
  active_state?: string
  active_color?: string
  inactive_color?: string
  icon_size?: 'sm' | 'md' | 'lg'
}

export interface StatusBarWidgetConfig {
  entries: (StatusBarEntry | StatusBarGroupEntry | StatusBarNavEntry | StatusBarRoomEntry)[]
  show_labels?: boolean
  orientation?: 'horizontal' | 'vertical'
  nav_position?: 'start' | 'end'
}

export interface EnergyWidgetConfig {
  grid_entity_id?: string
  solar_entity_id?: string
  battery_entity_id?: string
  name?: string
}

export interface ApplianceWidgetConfig {
  name?: string
  status_entity_id: string
  progress_entity_id?: string
  end_time_entity_id?: string
  countdown_entity_id?: string
  time_remaining_entity_id?: string
  program_entity_id?: string
  power_entity_id?: string
  door_entity_id?: string
  icon?: string
  running_state?: string
  compact?: boolean
}

export interface AlarmWidgetConfig {
  entity_id: string
  name?: string
  icon?: string
  code?: string
  prompt_for_code?: boolean
  use_keypad?: boolean
  use_keypad_on_mobile?: boolean
  code_length?: number
  compact?: boolean
  actions_align?: 'start' | 'center' | 'end'
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
  | CalendarV2WidgetConfig
  | PersonWidgetConfig
  | EnergyWidgetConfig
  | ApplianceWidgetConfig
  | AlarmWidgetConfig
  | StatusBarWidgetConfig

export interface WidgetAppearance {
  bg_color?: string        // Hintergrundfarbe der Karte
  bg_opacity?: number      // Deckkraft der Hintergrundfarbe in Prozent (0-100)
  border_color?: string    // Rahmenfarbe (Standard)
  active_color?: string    // Rahmenfarbe wenn Entity aktiv (on/open/playing…)
  border_width?: number    // Rahmenstärke in px (0–8)
  text_color?: string      // Textfarbe Override
  min_width?: number       // Minimale Breite in px
  disable_glass?: boolean  // Disable glass effect for this widget even when enabled globally
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
  theme_override?: string
  is_default?: boolean
  grid_config?: GridConfig
  widgets: Widget[]
  created_at: string
  updated_at: string
}

export type DashboardListItem = Omit<Dashboard, 'widgets'>

export type DefaultDashboardSource = 'user' | 'admin' | 'global' | 'fallback'

export interface DefaultDashboardResolution {
  dashboardId: string | null
  source: DefaultDashboardSource | null
}

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
