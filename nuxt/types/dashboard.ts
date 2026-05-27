export type WidgetType =
  | 'sensor'
  | 'gauge'
  | 'template'
  | 'switch'
  | 'button'
  | 'select'
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
  | 'problem_overview'
  | 'status_bar'
  | 'vacuum'
  | 'fan'
  | 'scene'
  | 'timer'
  | 'camera_status'
  | 'power_consumers'

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

export interface GaugeWidgetConfig {
  entity_id: string
  name?: string
  unit?: string
  decimal_places?: number
  value_position?: 'top' | 'right' | 'bottom' | 'left' | 'center'
  severity_direction?: 'high_bad' | 'low_bad'
  min?: number
  max?: number
  yellow_from?: number
  red_from?: number
  green_color?: string
  yellow_color?: string
  red_color?: string
}

export interface TemplateWidgetConfig {
  name?: string
  template: string
  refresh_interval?: number
}

export interface SwitchWidgetConfig {
  entity_id: string
  name?: string
  icon?: string
  sensor_entity_id?: string
  show_sensor_trend?: boolean
}

export interface ButtonWidgetConfig {
  entity_id: string
  name?: string
  icon?: string
}

export interface SelectWidgetConfig {
  entity_id: string
  name?: string
  icon?: string
}

export interface LightWidgetConfig {
  entity_id: string
  name?: string
  show_brightness?: boolean
  card_click_action?: 'toggle' | 'open_detail' | 'none'
  card_double_click_action?: 'toggle' | 'open_detail' | 'none'
  tap_action?: 'toggle' | 'open_detail' | 'none'
  double_tap_action?: 'toggle' | 'open_detail' | 'none'
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

export interface CameraStatusEntry {
  entity_id: string
  icon?: string
  inactive_icon?: string
  label?: string
  active_state?: string
  active_color?: string
  inactive_color?: string
}

export interface CameraWidgetConfig {
  entity_id: string
  name?: string
  refresh_interval?: number
  stream_type?: 'webrtc' | 'mjpeg' | 'snapshot'
  light_entity_id?: string
  status_entities?: CameraStatusEntry[]
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
  detail_humidity?: boolean
  detail_pressure?: boolean
  detail_wind?: boolean
  detail_visibility?: boolean
  warning_entity_id?: string
  warning_name?: string
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
  icon?: string
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
  light_entities?: string[]
  sensor_entity?: string
  sensor_icon?: string
  sensor_entities?: RoomCardSensorEntity[]
  status_entities?: RoomCardStatusEntity[]
  auto_status_entities?: boolean
  card_click_action?: 'none' | 'toggle_light' | 'open_light_detail' | 'open_climate_detail'
  card_double_click_action?: 'none' | 'toggle_light' | 'open_light_detail' | 'open_climate_detail'
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
  device_classes?: string[]
  name_contains?: string
  name_starts_with?: string
  areas?: string[]
  labels?: string[]
  exclude_groups?: boolean
}

export type StatusBarEntryAction = 'default' | 'none' | 'open_detail' | 'toggle' | 'call_service'

export interface StatusBarActionFields {
  click_action?: StatusBarEntryAction
  double_click_action?: StatusBarEntryAction
  hold_action?: StatusBarEntryAction
  click_service?: string
  click_target_entity?: string
  click_service_data?: string
  double_click_service?: string
  double_click_target_entity?: string
  double_click_service_data?: string
  hold_service?: string
  hold_target_entity?: string
  hold_service_data?: string
}

export interface StatusBarEntry extends StatusBarActionFields {
  excluded_user_ids?: string[]
  entry_type?: 'single'
  entity_id: string
  icon?: string
  inactive_icon?: string
  label?: string
  active_state?: string
  active_color?: string
  inactive_color?: string
  icon_size?: 'sm' | 'md' | 'lg'
}

export interface StatusBarGroupEntry extends StatusBarActionFields {
  excluded_user_ids?: string[]
  entry_type: 'group'
  icon: string
  label?: string
  filter: EntityGroupFilter
  show_badge?: boolean
  active_color?: string
  inactive_color?: string
  icon_size?: 'sm' | 'md' | 'lg'
}

export interface StatusBarNavEntry extends StatusBarActionFields {
  excluded_user_ids?: string[]
  entry_type: 'nav'
  icon: string
  label?: string
  dashboard_id: string
  icon_color?: string
  icon_size?: 'sm' | 'md' | 'lg'
}

export interface StatusBarRoomEntry extends StatusBarActionFields {
  excluded_user_ids?: string[]
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

export interface StatusBarProblemEntry extends ProblemOverviewWidgetConfig, StatusBarActionFields {
  excluded_user_ids?: string[]
  entry_type: 'problem'
  icon?: string
  inactive_icon?: string
  label?: string
  active_color?: string
  inactive_color?: string
  icon_size?: 'sm' | 'md' | 'lg'
  show_badge?: boolean
}

export interface StatusBarDividerEntry {
  entry_type: 'divider'
}

export interface StatusBarCameraEntry {
  excluded_user_ids?: string[]
  entry_type: 'camera'
  camera_entity_id: string
  sensor_entity_id?: string
  icon?: string
  label?: string
  active_state?: string
  active_color?: string
  inactive_color?: string
  icon_size?: 'sm' | 'md' | 'lg'
  default_stream?: 'webrtc' | 'mjpeg' | 'snapshot'
}

export interface StatusBarWidgetConfig {
  entries: (StatusBarEntry | StatusBarGroupEntry | StatusBarNavEntry | StatusBarRoomEntry | StatusBarProblemEntry | StatusBarDividerEntry | StatusBarCameraEntry)[]
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

export interface VacuumWidgetConfig {
  entity_id: string
  name?: string
}

export interface FanWidgetConfig {
  entity_id: string
  name?: string
  show_speed?: boolean
}

export interface SceneEntry {
  entity_id: string
  name?: string
  icon?: string
  color?: string
}

export interface SceneWidgetConfig {
  entries: SceneEntry[]
  name?: string
  columns?: number
}

export interface CameraStatusWidgetConfig {
  camera_entity_id: string
  sensor_entity_id: string
  name?: string
  active_state?: string
  active_color?: string
  inactive_color?: string
  snapshot_refresh?: number
  default_stream?: 'snapshot' | 'mjpeg'
}

export interface TimerEntry {
  entity_id: string
  name?: string
}

export interface TimerWidgetConfig {
  entity_id?: string
  timers?: TimerEntry[]
  name?: string
  finish_sound?: boolean
  finish_sound_volume?: number
  finish_blink?: boolean
}

export interface ProblemOverviewWidgetConfig {
  name?: string
  battery_threshold?: number
  max_items?: number
  show_batteries?: boolean
  show_unavailable?: boolean
  show_openings?: boolean
  show_updates?: boolean
  show_alerts?: boolean
  show_repairs?: boolean
  show_system?: boolean
  ignored_offline_platforms?: string[]
  ignored_offline_domains?: string[]
}

export interface PowerConsumerEntry {
  entity_id: string
  name?: string
}

export interface PowerConsumersWidgetConfig {
  consumers: PowerConsumerEntry[]
  name?: string
  price_per_kwh?: number
  currency_symbol?: string
}

export type WidgetConfig =
  | SensorWidgetConfig
  | GaugeWidgetConfig
  | TemplateWidgetConfig
  | SwitchWidgetConfig
  | ButtonWidgetConfig
  | SelectWidgetConfig
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
  | ProblemOverviewWidgetConfig
  | StatusBarWidgetConfig
  | VacuumWidgetConfig
  | FanWidgetConfig
  | SceneWidgetConfig
  | TimerWidgetConfig
  | CameraStatusWidgetConfig
  | PowerConsumersWidgetConfig

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

export interface WidgetVisibility {
  desktop?: boolean
  tablet?: boolean
  mobile?: boolean
}

export interface Widget {
  id: string
  type: WidgetType
  layout: WidgetLayout
  config: WidgetConfig
  appearance?: WidgetAppearance
  visibility?: WidgetVisibility
  excluded_user_ids?: string[]
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
  bg_opacity?: number
  bg_size?: 'cover' | 'contain' | 'auto'
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
