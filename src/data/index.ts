import { createSupabaseDataSource } from './supabase-data-source'
import type { IDataSource } from './IDataSource'

// THE swap point for the whole backend. Every `#/data/<feature>` module hands
// out a repository from this one object, so moving off Supabase is this line:
// replace the factory with the REST backend's (or, to migrate one domain at a
// time, spread the Supabase family and override the domains that have moved:
// `{ ...createSupabaseDataSource(), transactions: new ApiTransactionRepository() }`).
// Nothing outside src/data references a concrete implementation. See
// docs/adr/0001 and docs/adr/0011.
export const dataSource: IDataSource = createSupabaseDataSource()
