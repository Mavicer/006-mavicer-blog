// Mock auth service — localStorage-backed, same call shapes as the
// future FastAPI layer so useAuth.tsx can switch over with a one-line
// import change.

import {
  migrateLegacySession,
  publicUser,
  readSession,
  readUsers,
  clearLegacySession,
  writeSession,
  writeUsers,
} from "./storage";
import type { LoginInput, RegisterInput, Session, StoredUser, User } from "./types";

// Filling this preset owner key at registration grants is_owner=true.
// Mock-only — there is no real secret here.
const OWNER_KEY = "kmz080810@";

/** Seed a default owner account on first load so the blog has an admin
 *  without requiring manual registration. Idempotent — only creates
 *  the account if the username doesn't already exist. */
export function seedOwner(): void {
  const users = readUsers();
  if (users.some((u) => u.username === "leon_kong")) return;
  const stored: StoredUser = {
    id: nextUserId(users),
    username: "leon_kong",
    email: "2096014086@qq.com",
    display_name: "Mavicer",
    is_owner: true,
    created_at: new Date().toISOString(),
    password_hash: hash("kmz080810"),
  };
  writeUsers([...users, stored]);
}

/** Non-cryptographic hash. Purely to avoid storing plaintext. */
function hash(pw: string): string {
  let h = 5381;
  for (let i = 0; i < pw.length; i++) h = (h * 33) ^ pw.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function mockToken(userId: number): string {
  return btoa(`${userId}:${Date.now()}`);
}

function nextUserId(users: StoredUser[]): number {
  return users.reduce((m, u) => Math.max(m, u.id), 0) + 1;
}

export function register(input: RegisterInput): Session {
  const users = readUsers();
  const exists = users.some(
    (u) => u.username === input.username || u.email === input.email
  );
  if (exists) {
    const err = new Error("用户名或邮箱已存在") as Error & { status: number };
    err.status = 409;
    throw err;
  }
  const stored: StoredUser = {
    id: nextUserId(users),
    username: input.username,
    email: input.email,
    display_name: input.display_name || input.username,
    is_owner: !!input.owner_key && input.owner_key === OWNER_KEY,
    created_at: new Date().toISOString(),
    password_hash: hash(input.password),
  };
  writeUsers([...users, stored]);
  const session: Session = {
    access_token: mockToken(stored.id),
    user: publicUser(stored),
  };
  writeSession(session);
  return session;
}

export function login(input: LoginInput): Session {
  const users = readUsers();
  const u = users.find(
    (x) => x.username === input.username || x.email === input.username
  );
  if (!u || u.password_hash !== hash(input.password)) {
    const err = new Error("用户名或密码错误") as Error & { status: number };
    err.status = 401;
    throw err;
  }
  const session: Session = {
    access_token: mockToken(u.id),
    user: publicUser(u),
  };
  writeSession(session);
  return session;
}

export function logout(): void {
  writeSession(null);
  clearLegacySession();
}

export function currentUser(): User | null {
  migrateLegacySession();
  return readSession()?.user ?? null;
}

export function token(): string {
  return readSession()?.access_token ?? "";
}

export function storeSession(session: Session): void {
  writeSession(session);
}

// ---- shapes kept for useAuth.tsx parity with the old api.ts ----
export type { User };
