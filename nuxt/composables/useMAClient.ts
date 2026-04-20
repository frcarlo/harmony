import type { MASearchResult, MAItem } from '~/server/utils/ma-api'

interface MAStatus {
  available: boolean
  auth_required?: boolean
  url: string
  configured: boolean
}

const _status = ref<MAStatus | null>(null)
const _statusLoading = ref(false)

export function useMAClient() {
  async function checkStatus(force = false): Promise<MAStatus> {
    if (_status.value !== null && !force) return _status.value
    _statusLoading.value = true
    try {
      _status.value = await $fetch<MAStatus>('/api/ma/status')
    } catch {
      _status.value = { available: false, url: '', configured: false }
    } finally {
      _statusLoading.value = false
    }
    return _status.value!
  }

  async function search(query: string): Promise<MASearchResult> {
    return $fetch<MASearchResult>('/api/ma/search', { query: { q: query } })
  }

  function maImageUrl(item: MAItem): string | undefined {
    if (!item.image?.path) return undefined
    const { url } = _status.value ?? {}
    if (!url) return undefined
    const path = item.image.path
    if (path.startsWith('http')) return path
    return `${url}${path}`
  }

  const isAvailable = computed(() => _status.value?.available ?? false)

  return { checkStatus, search, maImageUrl, isAvailable }
}

export type { MASearchResult, MAItem }
