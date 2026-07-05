export interface AuthUser {
  token: string;
  email: string;
  fullName: string;
  role: "ADMIN" | "PRACTITIONER" | "LAB_STAFF" | "PATIENT";
}

const KEY = "medilink_auth";

export function saveAuth(user: AuthUser) {
  localStorage.setItem(KEY, JSON.stringify(user));
}

export function getAuth(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

export function clearAuth() {
  localStorage.removeItem(KEY);
}

export function getToken(): string | null {
  return getAuth()?.token ?? null;
}
