export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  return listDashboards(session?.user?.id, session?.user?.role)
})
