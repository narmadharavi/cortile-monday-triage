import { listResource } from './listResource.ts'
import type { Feedback, Resident, Snapshot, Ticket } from '../model.ts'

export const API_BASE = 'https://takehome.cortile.com/api/v1'
export const SNAPSHOT_TIME = Date.parse('2026-09-30T08:00:00.000Z')

type ApiTicket = Omit<Ticket, 'blockId' | 'homeLabel'>
type Home = { id: string; block: string; unit: string }
type Community = { id: string; name: string }

export async function loadRiverside(signal?: AbortSignal, request: typeof fetch = fetch): Promise<Snapshot> {
  function list<T>(path: string, communityId?: string) {
    const url = new URL(`${API_BASE}/${path}`)
    url.searchParams.set('limit', '10')
    if (communityId) url.searchParams.set('communityId', communityId)
    return listResource<T>({
      url: url.href,
      decodePage(payload) {
        const page = payload as { data?: T[]; nextCursor?: string | null } | null
        if (!Array.isArray(page?.data) || (page.nextCursor !== null && typeof page.nextCursor !== 'string')) {
          throw new Error(`Unexpected response from Cortile’s ${path} endpoint.`)
        }
        return { items: page.data, nextCursor: page.nextCursor }
      },
    }, 'cursor', signal, request)
  }

  const communities = await list<Community>('communities')
  const community = communities.find(item => item.name === 'Riverside Quarter')
  if (!community) throw new Error('Riverside Quarter was not found in Cortile’s communities.')

  const [tickets, feedback, residents, homes] = await Promise.all([
    list<ApiTicket>('tickets', community.id),
    list<Feedback>('feedback', community.id),
    list<Resident>('residents', community.id),
    list<Home>('homes', community.id),
  ])
  const homesById = new Map(homes.map(home => [home.id, home]))
  return {
    tickets: tickets.map(ticket => {
      const home = ticket.homeId === null ? undefined : homesById.get(ticket.homeId)
      return { ...ticket, blockId: home?.block ?? null, homeLabel: home?.unit }
    }),
    feedback,
    residents: residents.map(({ id, homeId, moveInDate, moveOutDate }) => ({ id, homeId, moveInDate, moveOutDate })),
  }
}
