import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not defined in environment variables');
  process.exit(1);
}

// Create postgres connection (pooled for app, single for migrations)
const client = postgres(connectionString, { max: 10 });

export const db = drizzle(client, { schema });

export type DB = typeof db;
