-- D1 Schema: visitor counter
-- Run this after creating the D1 database.
-- Command: npx wrangler d1 execute mavicer-visitors --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast UV queries (DISTINCT visitor_hash within time window)
CREATE INDEX IF NOT EXISTS idx_visits_hash_time
  ON visits (visitor_hash, created_at);

-- Index for fast PV count
CREATE INDEX IF NOT EXISTS idx_visits_created_at
  ON visits (created_at);
