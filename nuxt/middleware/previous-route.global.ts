export default defineNuxtRouteMiddleware((to, from) => {
  const goingBack = useState('dashboardNavGoingBack', () => false)
  if (goingBack.value) {
    goingBack.value = false
    return
  }
  if (from.path.startsWith('/dashboard/') && to.path.startsWith('/dashboard/')) {
    const stack = useState<string[]>('dashboardNavStack', () => [])
    stack.value = [...stack.value, from.path]
  }
  if (!to.path.startsWith('/dashboard/')) {
    useState<string[]>('dashboardNavStack', () => []).value = []
  }
})
