import pg from 'pg';

// Force TIMESTAMPTZ (type 1184) to be returned as ISO strings with timezone
// This ensures the frontend can correctly convert to the user's local timezone
pg.types.setTypeParser(1184, (val) => {
  // Parse as Date and return ISO string (always ends with Z for UTC)
  return val ? new Date(val).toISOString() : null;
});

export const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://happydo:happydo@db:5432/happydo_guard',
});
