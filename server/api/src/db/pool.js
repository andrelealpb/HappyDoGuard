import pg from 'pg';

export const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://happydo:happydo@db:5432/happydo_guard',
});
