import { maStatus } from '~/server/utils/ma-api'

export default defineEventHandler(async () => {
  return maStatus()
})
