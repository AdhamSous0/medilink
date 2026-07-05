const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8081";
const TOKEN_KEY = "medilink_token";
const SESSION_KEY = "medilink_session";

export interface SessionData {
  id: string;
  email: string;
  fullName: string;
  role: "doctor" | "medical_center" | "patient" | "laboratory" | "admin";
  token: string;
}

export function getSession(): SessionData | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SessionData) : null;
  } catch {
    return null;
  }
}

export function saveSession(data: SessionData) {
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event("medilink-auth"));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event("medilink-auth"));
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ data: T | null; error: { message: string } | null }> {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 204) return { data: null, error: null };

    if (res.status === 401) {
      clearSession();
      window.location.href = "/auth";
      return { data: null, error: { message: "Session expired. Please log in again." } };
    }

    const text = await res.text();
    if (!res.ok) {
      let message = text;
      try {
        message = (JSON.parse(text) as { message?: string }).message ?? text;
      } catch {}
      return { data: null, error: { message } };
    }

    if (!text) return { data: null, error: null };
    return { data: JSON.parse(text) as T, error: null };
  } catch (e) {
    return { data: null, error: { message: e instanceof Error ? e.message : "Network error" } };
  }
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export const auth = {
  getUser: (): Promise<{ data: { user: { id: string; email: string } | null } }> => {
    const s = getSession();
    return Promise.resolve({ data: { user: s ? { id: s.id, email: s.email } : null } });
  },

  signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
    const { data, error } = await request<{
      token: string; userId: string; email: string; fullName: string; appRole: string;
    }>("POST", "/api/auth/login", { email, password });
    if (error || !data) return { data: null, error };
    saveSession({
      id: data.userId, email: data.email, fullName: data.fullName,
      role: data.appRole as SessionData["role"], token: data.token,
    });
    return { data, error: null };
  },

  signUp: async ({
    email,
    password,
    options,
  }: {
    email: string;
    password: string;
    options?: {
      data?: {
        full_name?: string;
        role?: string;
        specialty?: string;
        organization_name?: string;
        provider_type?: string;
      };
    };
  }) => {
    const d = options?.data ?? {};
    const { data, error } = await request<{
      token: string; userId: string; email: string; fullName: string; appRole: string;
    }>("POST", "/api/auth/register", {
      email,
      password,
      fullName: d.full_name ?? "",
      role: d.role ?? "patient",
      specialty: d.specialty ?? null,
      organizationName: d.organization_name ?? null,
      providerType: d.provider_type ?? null,
    });
    if (error || !data) return { error };
    saveSession({
      id: data.userId, email: data.email, fullName: data.fullName,
      role: data.appRole as SessionData["role"], token: data.token,
    });
    return { error: null };
  },

  signOut: async () => {
    clearSession();
    return { error: null };
  },

  onAuthStateChange: (
    callback: (
      event: string,
      session: { user: { id: string; email: string } | null } | null,
    ) => void,
  ) => {
    const s = getSession();
    callback("INITIAL_SESSION", s ? { user: { id: s.id, email: s.email } } : null);

    const handler = () => {
      const s2 = getSession();
      callback(s2 ? "SIGNED_IN" : "SIGNED_OUT", s2 ? { user: { id: s2.id, email: s2.email } } : null);
    };
    window.addEventListener("medilink-auth", handler);
    return {
      data: { subscription: { unsubscribe: () => window.removeEventListener("medilink-auth", handler) } },
    };
  },
};

// ─── Typed REST helpers ──────────────────────────────────────────────────────

function get<T>(path: string) {
  return request<T>("GET", path);
}
function post<T>(path: string, body: unknown) {
  return request<T>("POST", path, body);
}
function patch<T>(path: string, body: unknown) {
  return request<T>("PATCH", path, body);
}
function del(path: string) {
  return request<void>("DELETE", path);
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const api = {
  // Profiles
  getMyProfile: () => get("/api/profiles/me"),
  getProfile: (id: string) => get(`/api/profiles/${id}`),
  getProfiles: (ids: string[]) =>
    ids.length > 0 ? get(`/api/profiles/batch?ids=${ids.join(",")}`) : Promise.resolve({ data: [], error: null }),

  // Medical centers
  getMedicalCenters: () => get<Array<{ id: string; organization_name: string | null; provider_type: string | null; address: string | null }>>("/api/medical-centers"),

  // Referrals
  getReferrals: () => get("/api/referrals"),
  createReferral: (body: unknown) => post("/api/referrals", body),
  getReferral: (id: string) => get(`/api/referrals/${id}`),
  updateReferral: (id: string, body: { status: string; rejection_reason?: string | null }) =>
    patch(`/api/referrals/${id}`, body),
  redirectReferral: (id: string, body: { new_center_id: string; note?: string | null }) =>
    post<{ newReferralId: string }>(`/api/referrals/${id}/redirect`, body),

  // Appointments
  getAppointments: (referralId?: string) =>
    get(`/api/appointments${referralId ? `?referral_id=${referralId}` : ""}`),
  createAppointment: (body: unknown) => post("/api/appointments", body),

  // Messages
  getMessages: (referralId: string) => get(`/api/messages?referral_id=${referralId}`),
  sendMessage: (body: { referral_id: string; body: string }) => post("/api/messages", body),

  // Reports
  getReports: (referralId: string) => get(`/api/reports?referral_id=${referralId}`),
  createReport: (body: unknown) => post("/api/reports", body),

  // Attachments
  getAttachments: (referralId: string) => get(`/api/attachments?referral_id=${referralId}`),

  // Notifications
  getNotifications: () => get("/api/notifications"),
  getUnreadCount: () => get<{ count: number }>("/api/notifications/unread-count"),
  markNotificationRead: (id: string) => patch(`/api/notifications/${id}`, { read: true }),
  markAllNotificationsRead: () => patch("/api/notifications/mark-all-read", {}),
  deleteNotification: (id: string) => del(`/api/notifications/${id}`),

  // Timeline
  getReferralTimeline: (id: string) => get(`/api/referrals/${id}/timeline`),

  // Analytics
  getDashboardAnalytics: () => get("/api/analytics/dashboard"),

  // Search
  search: (q: string) => get<{ referrals: unknown[]; patients: unknown[] }>(`/api/search?q=${encodeURIComponent(q)}`),

  // Availability
  getMyAvailability: () => get<{ availability_status: string }>("/api/availability/me"),
  updateAvailability: (status: string) => patch("/api/availability/me", { availability_status: status }),

  // Lab
  getLabRequests: () => get("/api/lab/requests"),
  createLabRequest: (body: unknown) => post("/api/lab/requests", body),
  updateLabRequest: (id: string, body: unknown) => patch(`/api/lab/requests/${id}`, body),

  // Admin
  getAdminUsers: () => get("/api/admin/users"),
  updateAdminUser: (id: string, body: unknown) => patch(`/api/admin/users/${id}`, body),
  getAdminStats: () => get<{ totalUsers: number; totalReferrals: number; totalDoctors: number; totalCenters: number }>("/api/admin/stats"),

  // Profile
  updateMyProfile: (body: unknown) => patch("/api/profiles/me", body),

  // Password
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    post<void>("/api/auth/change-password", body),

  // Directory
  getDoctors: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return get(`/api/directory/doctors${q}`);
  },
  getDoctor: (id: string) => get(`/api/directory/doctors/${id}`),
  getCenters: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return get(`/api/directory/centers${q}`);
  },
  getDirectoryCenter: (id: string) => get(`/api/directory/centers/${id}`),
  getLabs: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return get(`/api/directory/labs${q}`);
  },

  // Smart Suggestions
  getSuggestions: (specialty?: string) =>
    get(`/api/suggestions${specialty ? `?specialty=${encodeURIComponent(specialty)}` : ""}`),
  getReplacements: (excludeId: string, specialty?: string) =>
    get(`/api/suggestions/replacement?excludeId=${excludeId}${specialty ? `&specialty=${encodeURIComponent(specialty)}` : ""}`),

  // Equipment
  getEquipment: () => get("/api/equipment"),
  addEquipment: (body: unknown) => post("/api/equipment", body),
  updateEquipment: (id: string, body: unknown) => patch(`/api/equipment/${id}`, body),
  deleteEquipment: (id: string) => del(`/api/equipment/${id}`),

  // Favorites
  getFavorites: () => get("/api/favorites"),
  addFavorite: (targetId: string) => post(`/api/favorites/${targetId}`, {}),
  removeFavorite: (targetId: string) => del(`/api/favorites/${targetId}`),
  checkFavorite: (targetId: string) => get<{ favorited: boolean }>(`/api/favorites/${targetId}/check`),

  // Doctor Invitations
  sendInvitation: (centerId: string, doctorId: string, message?: string) =>
    post(`/api/directory/centers/${centerId}/invite`, { doctor_id: doctorId, message }),
  getInvitations: () => get("/api/invitations"),
  getSentInvitations: () => get("/api/invitations/sent"),
  respondToInvitation: (id: string, status: "accepted" | "rejected") =>
    patch(`/api/invitations/${id}`, { status }),

  // Affiliations & Schedules
  getAffiliations: () => get("/api/affiliations"),
  cancelAffiliation: (invitationId: string) =>
    patch(`/api/affiliations/${invitationId}/cancel`, {}),
  getSchedule: (invitationId: string) =>
    get(`/api/affiliations/${invitationId}/schedule`),
  addScheduleSlot: (invitationId: string, slot: { day_of_week: number; start_time: string; end_time: string; notes?: string }) =>
    post(`/api/affiliations/${invitationId}/schedule`, slot),
  deleteScheduleSlot: (slotId: string) =>
    del(`/api/affiliations/schedule/${slotId}`),
};
