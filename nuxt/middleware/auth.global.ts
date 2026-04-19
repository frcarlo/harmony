export default defineNuxtRouteMiddleware(async (to) => {
  const publicRoutes = ['/login', '/setup']
  if (publicRoutes.includes(to.path)) return

  const { loggedIn, user } = useUserSession()

  if (!loggedIn.value) {
    const { needsSetup } = await $fetch<{ needsSetup: boolean }>('/api/setup/status')
    if (needsSetup) return navigateTo('/setup')
    return navigateTo('/login')
  }

  // Admin-only routes
  if (to.path.startsWith('/edit/') && user.value?.role !== 'admin') {
    return navigateTo(`/dashboard/${to.params.id}`)
  }
  if (to.path.startsWith('/admin/') && user.value?.role !== 'admin') {
    return navigateTo('/dashboard')
  }
})
