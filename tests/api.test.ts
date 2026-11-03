import assert from 'node:assert/strict'
import test from 'node:test'
import { collectPages, createApiClient } from '../src/api.ts'

test('follows opaque cursors across an empty page', async () => {
  const seen: (string | null)[] = []
  const items = await collectPages(async cursor => {
    seen.push(cursor)
    if (cursor === null) return { items: [1], nextCursor: '+/=' }
    if (cursor === '+/=') return { items: [], nextCursor: 'next' }
    return { items: [2], nextCursor: null }
  })
  assert.deepEqual(seen, [null, '+/=', 'next'])
  assert.deepEqual(items, [1, 2])
})

test('rejects repeated cursors', async () => {
  await assert.rejects(collectPages(async () => ({ items: [], nextCursor: 'same' })), /repeated/)
})

test('preserves resource filters and passes the encoded cursor on subsequent requests', async () => {
  const fetcher: typeof fetch = async input => {
    const url = new URL(String(input))
    assert.equal(url.searchParams.get('building'), 'riverside')
    const cursor = url.searchParams.get('after')
    if (cursor !== null) assert.equal(cursor, '+/=')
    return Response.json({ items: [], nextCursor: cursor === null ? '+/=' : null })
  }
  const resource = {
    url: 'https://example.invalid/list?building=riverside',
    decodePage: (payload: unknown) => payload as { items: never[], nextCursor: string | null },
  }
  const client = createApiClient({
    tickets: resource, feedback: resource, residents: resource, cursorParam: 'after', fetcher,
  })
  assert.deepEqual(await client.load(), { tickets: [], feedback: [], residents: [] })
})
