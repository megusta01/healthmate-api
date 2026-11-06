import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node --transpile-only prisma/seed.ts',
  },
  datasource: {
    // migrations precisam da conexão direta (sem pgbouncer)
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  },
})
