import type { Snapshot } from './model.ts'

export interface CursorPage<T> {
  items: T[]
  nextCursor: string | null
}

export async function collectPages<T>(
  fetchPage: (cursor: string | null) => Promise<CursorPage<T>>,
): Promise<T[]> {
  const seen = new Set<string>()
  const items: T[] = []
  let cursor: string | null = null
  do {
    const page = await fetchPage(cursor)
    items.push(...page.items)
    cursor = page.nextCursor
    if (cursor !== null) {
      if (seen.has(cursor)) throw new Error('The API repeated a pagination cursor.')
      seen.add(cursor)
    }
  } while (cursor !== null)
  return items
}

export interface Resource<T> {
  url: string
  decodePage: (payload: unknown) => CursorPage<T>
}

interface ClientConfig {
  tickets: Resource<Snapshot['tickets'][number]>
  feedback: Resource<Snapshot['feedback'][number]>
  residents: Resource<Snapshot['residents'][number]>
  cursorParam: string
  fetcher?: typeof fetch
}

export function createApiClient(config: ClientConfig) {
  const request = config.fetcher ?? fetch
  async function list<T>(resource: Resource<T>, signal?: AbortSignal) {
    return collectPages(async cursor => {
      const url = new URL(resource.url)
      if (cursor !== null) url.searchParams.set(config.cursorParam, cursor)
      const response = await request(url, { signal, headers: { Accept: 'application/json' } })
      if (!response.ok) throw new Error(`API request failed (HTTP ${response.status}).`)
      return resource.decodePage(await response.json())
    })
  }
  return {
    async load(signal?: AbortSignal): Promise<Snapshot> {
      const [tickets, feedback, residents] = await Promise.all([
        list(config.tickets, signal), list(config.feedback, signal), list(config.residents, signal),
      ])
      return { tickets, feedback, residents }
    },
  }
}
