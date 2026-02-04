import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/shared/database/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT) || 5432,
    user: process.env.DATABASE_USER || 'cinema_user',
    password: process.env.DATABASE_PASSWORD || 'cinema_pass',
    database: process.env.DATABASE_NAME || 'cinema_db',
    ssl: false,
  },
  verbose: true,
  strict: true,
});
