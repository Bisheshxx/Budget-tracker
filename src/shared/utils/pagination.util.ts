export function nextPageCursor<TItem, TCursor>(
  page: TItem[],
  pageSize: number,
  getCursor: (lastItem: TItem) => TCursor,
): TCursor | undefined {
  if (page.length < pageSize) return undefined
  const last = page[page.length - 1]
  return getCursor(last)
}
