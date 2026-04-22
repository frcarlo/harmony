import { toast } from 'vue-sonner'

export const useServerUpdates = () => {
  const { t } = useI18n()
  const { loggedIn } = useUserSession()
  const route = useRoute()

  onMounted(() => {
    if (!loggedIn.value) return

    let knownStartupId: string | null = null
    let es: EventSource | null = null

    function connect() {
      es = new EventSource('/api/sse/updates')

      es.onmessage = (e) => {
        const data = JSON.parse(e.data)

        if (data.type === 'init') {
          if (knownStartupId && knownStartupId !== data.startupId) {
            toast(t('updates.server_redeployed'), {
              duration: Infinity,
              action: { label: t('updates.reload'), onClick: () => location.reload() },
            })
          }
          knownStartupId = data.startupId
        }

        if (data.type === 'dashboard.updated') {
          const currentId = route.params.id
          if (currentId && currentId === data.id) {
            toast(t('updates.dashboard_updated'), {
              duration: Infinity,
              action: { label: t('updates.reload'), onClick: () => location.reload() },
            })
          }
        }
      }

      es.onerror = () => {
        es?.close()
        setTimeout(connect, 5000)
      }
    }

    connect()
    onUnmounted(() => es?.close())
  })
}
