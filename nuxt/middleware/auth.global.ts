export default defineNuxtRouteMiddleware(async (to) => {
  const publicRoutes = ['/login', '/setup']
  if (publicRoutes.includes(to.path)) return

  const { loggedIn, user } = useUserSession()

  if (!loggedIn.value) {
    const { needsSetup } = await $fetch<{ needsSetup: boolean }>('/api/setup/status')
    if (needsSetup) return navigateTo('/setup')
    return navigateTo('/login')
  }

  // Role-restricted routes
  const role = user.value?.role
  if (to.path.startsWith('/edit/') && role !== 'admin' && role !== 'editor') {
    return navigateTo(`/dashboard/${to.params.id}`)
  }
  if (to.path.startsWith('/admin/') && role !== 'admin') {
    return navigateTo('/dashboard')
  }
})
