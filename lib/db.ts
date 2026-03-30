import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>
const globalForDb = globalThis as unknown as { db: DrizzleDb }

const ssl =
  process.env.DATABASE_URL?.includes('railway') || process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false

const client = postgres(process.env.DATABASE_URL!, { ssl })
export const db = globalForDb.db ?? drizzle(client, { schema })

if (process.env.NODE_ENV !== 'production') globalForDb.db = db
