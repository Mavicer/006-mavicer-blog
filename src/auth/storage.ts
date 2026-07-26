// localStorage-backed user table + session store for the mock auth layer.
//
// Two keys:
//   MAVICER_USERS   — StoredUser[]  (the "database")
//   MAVICER_SESSION  — Session JSON  (the current logged-in user)
//
// All access is synchronous and side-effectful, matching how the rest of
// the app reads/writes localStorage directly. Swap these functions for
// network calls when the real backend lands.

import type { Session, StoredUser, User } from "./types";

const USERS_KEY = "MAVICER_USERS";
const SESSION_KEY = "MAVICER_SESSION";

export function readUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function writeUsers(users: StoredUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function readSession(): Session | null {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

export function writeSession(session: Session | null): void {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

/** Strip the password hash before exposing a user to the React layer. */
export function publicUser(u: StoredUser): User {
  const { password_hash: _ph, ...rest } = u;
  return rest;
}

// ---- back-compat shims for the old api.ts key names ----
// The previous auth flow stored the session under MAVICER_TOKEN / MAVICER_USER.
// We keep those keys in sync so any stale data and the downstream
// components that still peek at them (e.g. currentUser()) keep working.
const OLD_TOKEN_KEY = "MAVICER_TOKEN";
const OLD_USER_KEY = "MAVICER_USER";

export function migrateLegacySession(): void {
  const tok = localStorage.getItem(OLD_TOKEN_KEY);
  const usr = localStorage.getItem(OLD_USER_KEY);
  if (tok && usr && !readSession()) {
    try {
      const user = JSON.parse(usr) as User;
      writeSession({ access_token: tok, user });
    } catch {
      /* ignore */
    }
  }
}

export function clearLegacySession(): void {
  localStorage.removeItem(OLD_TOKEN_KEY);
  localStorage.removeItem(OLD_USER_KEY);
}
