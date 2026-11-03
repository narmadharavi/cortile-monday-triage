import { collectPages, type CursorPage } from './collectPages.ts'

export interface Resource<T> {
  url: string
  decodePage: (payload: unknown) => CursorPage<T>
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
