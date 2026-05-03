import type { HAState } from '~/types/ha'

const OPEN_CLOSED_BINARY_CLASSES = new Set([
  'door',
  'garage_door',
  'opening',
  'window',
])

const DETECTION_BINARY_CLASSES = new Set([
  'motion',
  'occupancy',
  'presence',
])

export function useLocalizedEntityState() {
  const { t } = useI18n()

  function formatEntityState(entity: HAState | undefined, fallback = '—') {
    if (!entity) return fallback

    const state = entity.state
    const domain = entity.entity_id.split('.')[0]
    const deviceClass = entity.attributes?.device_class as string | undefined
    const unit = entity.attributes?.unit_of_measurement as string | undefined

    if (state === 'unavailable') return t('common.unavailable')
    if (state === 'unknown') return t('common.unknown')

    if (domain === 'binary_sensor') {
      if (OPEN_CLOSED_BINARY_CLASSES.has(deviceClass ?? '')) {
        if (state === 'on') return t('common.open_state')
        if (state === 'off') return t('common.closed_state')
      }
      if (DETECTION_BINARY_CLASSES.has(deviceClass ?? '')) {
        if (state === 'on') return t('common.detected')
        if (state === 'off') return t('common.clear')
      }
    }

    if (domain === 'cover') {
      const key = ({
        open: 'cover.open',
        opening: 'cover.opening',
        closed: 'cover.closed',
        closing: 'cover.closing',
        stopped: 'cover.stopped',
      } as Record<string, string>)[state]
      if (key) return t(key)
    }

    if (domain === 'lock') {
      const key = `lock.state.${state}`
      const translated = t(key)
      if (translated !== key) return translated
      if (state === 'locked') return t('common.locked')
      if (state === 'unlocked') return t('common.unlocked')
    }

    if (domain === 'media_player') {
      const key = ({
        playing: 'common.playing',
        paused: 'common.paused',
        idle: 'common.idle',
      } as Record<string, string>)[state]
      if (key) return t(key)
    }

    if (domain === 'climate') {
      const key = ({
        heat: 'thermostat.mode_heat',
        cool: 'thermostat.mode_cool',
        auto: 'thermostat.mode_auto',
        off: 'thermostat.mode_off',
      } as Record<string, string>)[state]
      if (key) return t(key)
    }

    if (state === 'on') return t('common.on')
    if (state === 'off') return t('common.off')

    return `${state}${unit ? ` ${unit}` : ''}`
  }

  return { formatEntityState }
}
