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

export async function listResource<T>(resource: Resource<T>, cursorParam: string, signal?: AbortSignal, request = fetch) {
  return collectPages(async cursor => {
    const url = new URL(resource.url)
    if (cursor !== null) url.searchParams.set(cursorParam, cursor)
    const init = { signal, headers: { Accept: 'application/json' } }
    let response = await request(url, init)
    for (let attempt = 0; attempt < 2 && [500, 503].includes(response.status); attempt++) {
      const retryAfter = response.headers.get('Retry-After')
      const seconds = retryAfter === null ? NaN : Number(retryAfter)
      const delay = Number.isFinite(seconds) ? seconds * 1000
        : retryAfter ? Date.parse(retryAfter) - Date.now() : 1000 * (attempt + 1)
      await response.body?.cancel()
      await new Promise<void>(resolve => setTimeout(resolve, Math.max(0, Math.min(10_000, delay || 0))))
      signal?.throwIfAborted()
      response = await request(url, init)
    }
    if (!response.ok) throw new Error(`API request failed (HTTP ${response.status}).`)
    return resource.decodePage(await response.json())
  })
}

export function createApiClient(config: ClientConfig) {
  const request = config.fetcher ?? fetch
  return {
    async load(signal?: AbortSignal): Promise<Snapshot> {
      const [tickets, feedback, residents] = await Promise.all([
        listResource(config.tickets, config.cursorParam, signal, request),
        listResource(config.feedback, config.cursorParam, signal, request),
        listResource(config.residents, config.cursorParam, signal, request),
      ])
      return { tickets, feedback, residents }
    },
  }
}
