import { countUsers } from '~/server/utils/db'

export default defineEventHandler(() => {
  return { needsSetup: countUsers() === 0 }
})
