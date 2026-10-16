import type { Context } from "./http";

// Additive, retryable migration. Never mark a failed migration as complete.
// There is no shared request/promise or DB handle stored across invocations.
export async function ensureAccounts(ctx: Context): Promise<void> {
  const db = ctx.env.DB;
  await db.prepare(`CREATE TABLE IF NOT EXISTS app_migration (version TEXT PRIMARY KEY)`).run();
  if (await db.prepare(`SELECT version FROM app_migration WHERE version = 'accounts-v1'`).first()) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS blog_user (
      id TEXT PRIMARY KEY, username TEXT NOT NULL COLLATE NOCASE UNIQUE,
      display_name TEXT NOT NULL, password_hash TEXT NOT NULL,
      is_owner INTEGER NOT NULL DEFAULT 0, must_change_password INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS blog_session (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES blog_user(id), expires_at INTEGER NOT NULL)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_blog_session_user ON blog_session(user_id)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_blog_session_expiry ON blog_session(expires_at)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS account_favorite (
      user_id TEXT NOT NULL REFERENCES blog_user(id), post_slug TEXT NOT NULL,
      created_at TEXT NOT NULL, PRIMARY KEY(user_id, post_slug))`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_account_favorite_slug ON account_favorite(post_slug)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS account_rate_limit (key TEXT PRIMARY KEY, hits INTEGER NOT NULL, expires_at INTEGER NOT NULL)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_account_rate_expiry ON account_rate_limit(expires_at)`),
  ]);
  const columns = await db.prepare(`PRAGMA table_info(comment)`).all<{ name: string }>();
  if (!columns.results.some((column) => column.name === "user_id")) {
    try { await db.prepare(`ALTER TABLE comment ADD COLUMN user_id TEXT REFERENCES blog_user(id)`).run(); }
    catch (error) {
      // Concurrent first requests may both observe the old schema. Only ignore
      // the race if the column now really exists; all other failures propagate.
      const current = await db.prepare(`PRAGMA table_info(comment)`).all<{ name: string }>();
      if (!current.results.some((column) => column.name === "user_id")) throw error;
    }
  }
  await db.prepare(`INSERT OR IGNORE INTO app_migration (version) VALUES ('accounts-v1')`).run();
}
