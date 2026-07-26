// Mock auth types — shapes mirror the future JWT/User contract so the
// React layer never needs to change when we swap localStorage for FastAPI.

export type User = {
  id: number;
  username: string;
  email: string;
  display_name: string;
  is_owner: boolean;
  created_at: string; // ISO
};

/** What we persist in the user table — includes the password hash. */
export type StoredUser = User & {
  password_hash: string;
};

export type Session = {
  access_token: string; // mock token: base64(user id + ":" + ts)
  user: User;
};

export type RegisterInput = {
  username: string;
  email: string;
  password: string;
  display_name?: string;
  /** If it matches the preset owner key, the new user becomes an owner. */
  owner_key?: string;
};

export type LoginInput = {
  username: string; // accepts username or email
  password: string;
};
