import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 })
  const db  = drizzle(sql)

  await migrate(db, { migrationsFolder: './drizzle' })
  console.log('Migrations complete')
  await sql.end()
}

main().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
