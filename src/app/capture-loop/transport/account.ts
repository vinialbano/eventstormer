import { getJson } from '../client.ts'
import type { AccountSnapshot } from '../types.ts'

export const fetchReadableAccount = (workshopId: string): Promise<AccountSnapshot> =>
  getJson<AccountSnapshot>(`/api/workshops/${workshopId}/readable-account`)
