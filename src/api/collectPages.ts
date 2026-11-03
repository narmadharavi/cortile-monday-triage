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
