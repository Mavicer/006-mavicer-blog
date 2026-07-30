// Mock auth types — shapes mirror the future JWT/User contract so the
// React layer never needs to change when we swap localStorage for FastAPI.
//
// ⚠️  These types are used by the frontend mock. Production types
//     should come from the backend API schema.

export type User = {
  id: number;
  username: string;
  email: string;
  display_name: string;
  is_owner: boolean;
  created_at: string; // ISO
};

/** What we persist in the user table — includes the password hash.
 *  In production this data lives server-side only; never expose
 *  StoredUser to the client. */
export type StoredUser = User & {
  password_hash: string; // PBKDF2 format: "pbkdf2$iterations$salt$hash"
};

export type Session = {
  access_token: string; // mock token: base64(user id + ":" + ts)
  user: User;
  /** Frontend-only expiration timestamp (ms). Not cryptographically
   *  secure — production must validate sessions server-side. */
  expires_at?: number;
};

export type RegisterInput = {
  username: string;
  email: string;
  password: string;
  display_name?: string;
  /** In mock mode, providing ANY owner_key grants is_owner=true.
   *  Production: server validates against a server-side secret. */
  owner_key?: string;
};

export type LoginInput = {
  username: string; // accepts username or email
  password: string;
};
