import { getHomePageSettings } from '~/server/utils/db'

export default defineEventHandler(async () => {
  return getHomePageSettings()
})
