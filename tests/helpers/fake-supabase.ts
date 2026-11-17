// A recording stand-in for the supabase-js query builder, for the data-layer
// adapter tests. `from(table)` returns a chainable, awaitable builder: every
// chained call (`select`, `eq`, `order`, …) is recorded, and awaiting the chain
// resolves with the next enqueued `{ data, error }` result. Tests then assert on
// which table was hit, with which filters/payload — no network, no env vars.
// `rpc(fn, args)` is recorded the same way, under the table name `rpc:<fn>`
// with a single `rpc` op carrying the arguments.

type Op = [method: string, args: unknown[]]

interface RecordedQuery {
  table: string
  ops: Op[]
}

interface QueryResult {
  data?: unknown
  error?: unknown
  count?: number | null
}

class FakeSupabase {
  queries: RecordedQuery[] = []
  private results: QueryResult[] = []

  /** Queue the result the next awaited query resolves with (FIFO). */
  enqueue(result: QueryResult): this {
    this.results.push({ data: null, error: null, ...result })
    return this
  }

  reset(): void {
    this.queries = []
    this.results = []
  }

  /** The arguments of every `method` call on the nth recorded query. */
  argsOf(index: number, method: string): unknown[][] {
    return this.queries[index].ops
      .filter(([name]) => name === method)
      .map(([, args]) => args)
  }

  private record(table: string, ops: Op[] = []): unknown {
    {
      const query: RecordedQuery = { table, ops }
      this.queries.push(query)
      const builder: unknown = new Proxy(
        {},
        {
          get: (_target, prop) => {
            if (prop === 'then') {
              const result = this.results.shift() ?? { data: [], error: null }
              return (
                resolve: (value: QueryResult) => unknown,
                reject: (reason: unknown) => unknown,
              ) => Promise.resolve(result).then(resolve, reject)
            }
            return (...args: unknown[]) => {
              query.ops.push([String(prop), args])
              return builder
            }
          },
        },
      )
      return builder
    }
  }

  readonly client = {
    from: (table: string) => this.record(table),
    rpc: (fn: string, args?: unknown) =>
      this.record(`rpc:${fn}`, [['rpc', [args]]]),
  }
}

export const fakeSupabase = new FakeSupabase()

/** A PostgREST-shaped error, as supabase-js returns it in `{ error }`. */
export function postgrestError(code: string, message = 'db said no') {
  return { code, message, details: '', hint: '' }
}
