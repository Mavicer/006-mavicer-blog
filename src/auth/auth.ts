// Mock auth service — localStorage-backed, same call shapes as the
// future FastAPI layer so useAuth.tsx can switch over with a one-line
// import change.
//
// ⚠️  SECURITY: This is a FRONTEND-ONLY mock. It provides UX-level
//     protection (preventing casual users from stumbling into admin
//     features) but NOT real security. Anyone with DevTools can
//     read/modify localStorage. Production auth must be server-side
//     (FastAPI + JWT + Argon2id).

import {
  migrateLegacySession,
  publicUser,
  readSession,
  readUsers,
  clearLegacySession,
  writeSession,
  writeUsers,
} from "./storage";
import type { LoginInput, RegisterInput, Session, StoredUser } from "./types";
import type { User } from "./types";

export type { User };

// Owner key is NOT hardcoded here. In the mock system, any value
// provided as owner_key during registration grants is_owner=true.
// In production, this validation MUST happen server-side.
// The previous hardcoded key ("kmz080810@") was removed because it
// was committed to a public GitHub repo and is considered leaked.
// To create an owner account, register with any owner_key value
// via the registration form.

function mockToken(userId: number): string {
  return btoa(`${userId}:${Date.now()}`);
}

function nextUserId(users: StoredUser[]): number {
  return users.reduce((m, u) => Math.max(m, u.id), 0) + 1;
}

// ── PBKDF2 password hashing via Web Crypto API ──────────────────
// This replaces the insecure DJB2 hash. PBKDF2 with SHA-256 and
// 100k iterations is the best we can do client-side.
// Production should migrate to Argon2id or bcrypt on the server.

const PBKDF2_ITERATIONS = 100_000;
const SALT_LENGTH = 16; // bytes
const KEY_LENGTH = 32; // bytes

function generateSalt(): string {
  const arr = new Uint8Array(SALT_LENGTH);
  crypto.getRandomValues(arr);
  return bytesToHex(arr);
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_LENGTH * 8
  );
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${bytesToHex(new Uint8Array(derived))}`;
}

/** Verify a password against a stored hash. Supports both old DJB2
 *  format (plain base36 string) and new PBKDF2 format. */
async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (stored.startsWith("pbkdf2$")) {
    const [, , salt, expectedHash] = stored.split("$");
    const computed = await hashPassword(password, salt);
    return computed === stored;
  }
  // Legacy DJB2 fallback — for migration only. On successful login,
  // the caller will rehash with PBKDF2.
  let h = 5381;
  for (let i = 0; i < password.length; i++) h = (h * 33) ^ password.charCodeAt(i);
  return (h >>> 0).toString(36) === stored;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Auth functions ───────────────────────────────────────────────

export async function register(input: RegisterInput): Promise<Session> {
  const users = readUsers();
  const exists = users.some(
    (u) => u.username === input.username || u.email === input.email
  );
  if (exists) {
    const err = new Error("用户名或邮箱已存在") as Error & { status: number };
    err.status = 409;
    throw err;
  }
  const salt = generateSalt();
  const passwordHash = await hashPassword(input.password, salt);
  const stored: StoredUser = {
    id: nextUserId(users),
    username: input.username,
    email: input.email,
    display_name: input.display_name || input.username,
    // In mock mode, providing any owner_key grants owner status.
    // Production: server must validate owner_key against a server-side secret.
    is_owner: !!input.owner_key,
    created_at: new Date().toISOString(),
    password_hash: passwordHash,
  };
  writeUsers([...users, stored]);
  const session: Session = {
    access_token: mockToken(stored.id),
    user: publicUser(stored),
    expires_at: Date.now() + 24 * 60 * 60 * 1000, // 24h
  };
  writeSession(session);
  return session;
}

export async function login(input: LoginInput): Promise<Session> {
  const users = readUsers();
  const u = users.find(
    (x) => x.username === input.username || x.email === input.username
  );
  if (!u || !(await verifyPassword(input.password, u.password_hash))) {
    const err = new Error("用户名或密码错误") as Error & { status: number };
    err.status = 401;
    throw err;
  }

  // Migrate legacy DJB2 hash to PBKDF2 on successful login.
  let updatedUser = u;
  if (!u.password_hash.startsWith("pbkdf2$")) {
    const salt = generateSalt();
    const newHash = await hashPassword(input.password, salt);
    updatedUser = { ...u, password_hash: newHash };
    const allUsers = readUsers();
    const idx = allUsers.findIndex((x) => x.id === u.id);
    if (idx >= 0) {
      allUsers[idx] = updatedUser;
      writeUsers(allUsers);
    }
  }

  const session: Session = {
    access_token: mockToken(u.id),
    user: publicUser(updatedUser),
    expires_at: Date.now() + 24 * 60 * 60 * 1000, // 24h
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
  const session = readSession();
  if (!session) return null;

  // Expiration check — frontend-only, not cryptographically secure.
  // Production must validate the session server-side.
  if (session.expires_at && Date.now() > session.expires_at) {
    writeSession(null);
    return null;
  }

  return session.user ?? null;
}

export function token(): string {
  return readSession()?.access_token ?? "";
}

export function storeSession(session: Session): void {
  writeSession(session);
}
