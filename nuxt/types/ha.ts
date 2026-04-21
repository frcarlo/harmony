export interface HAState {
  entity_id: string
  state: string
  attributes: Record<string, unknown>
  last_changed: string
  last_updated: string
  context: {
    id: string
    parent_id: string | null
    user_id: string | null
  }
}

export interface HAWSAuthRequired {
  type: 'auth_required'
  ha_version: string
}

export interface HAWSAuthOk {
  type: 'auth_ok'
  ha_version: string
}

export interface HAWSAuthInvalid {
  type: 'auth_invalid'
  message: string
}

export interface HAWSResult {
  id: number
  type: 'result'
  success: boolean
  result: unknown
  error?: { code: string; message: string }
}

export interface HAWSEvent {
  id: number
  type: 'event'
  event: {
    event_type: string
    data: {
      entity_id: string
      new_state: HAState | null
      old_state: HAState | null
    }
  }
}

export type HAWSMessage =
  | HAWSAuthRequired
  | HAWSAuthOk
  | HAWSAuthInvalid
  | HAWSResult
  | HAWSEvent

export interface BrowseMediaNode {
  title: string
  media_class: string
  media_content_type: string
  media_content_id: string
  can_play: boolean
  can_expand: boolean
  thumbnail?: string | null
  children?: BrowseMediaNode[]
}

export interface HAArea {
  area_id: string
  name: string
  floor_id?: string | null
}

export interface HAEntityRegistryEntry {
  entity_id: string
  area_id?: string | null
  device_id?: string | null
  disabled_by?: string | null
  labels?: string[]
  platform?: string
}

export interface HALabel {
  label_id: string
  name: string
  color?: string | null
  icon?: string | null
}

export interface HADeviceRegistryEntry {
  id: string
  area_id?: string | null
  labels?: string[]
}

export interface HAServiceCall {
  domain: string
  service: string
  service_data?: Record<string, unknown>
  target?: {
    entity_id?: string | string[]
  }
}
