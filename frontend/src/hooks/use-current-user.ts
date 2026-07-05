import { useEffect, useState } from "react";
import { api, auth, getSession, type SessionData } from "@/lib/api";

export type AppRole = "doctor" | "medical_center" | "patient" | "laboratory" | "admin";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  specialty: string | null;
  license_number: string | null;
  date_of_birth: string | null;
  organization_name: string | null;
  provider_type: string | null;
  address: string | null;
  avatar_url: string | null;
}

/** Shape compatible with what the pages expect from the old supabase User type */
export interface CurrentUserState {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
}

export function useCurrentUser(): CurrentUserState {
  const [session, setSession] = useState<SessionData | null>(getSession);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadProfile(s: SessionData | null) {
      if (!s) {
        setProfile(null);
        setLoading(false);
        return;
      }
      const { data } = await api.getMyProfile();
      if (!active) return;
      setProfile((data as Profile) ?? null);
      setLoading(false);
    }

    loadProfile(session);

    // Listen for sign-in / sign-out events
    const { data: sub } = auth.onAuthStateChange((_event, sess) => {
      const next = sess?.user ? getSession() : null;
      setSession(next);
      setLoading(true);
      loadProfile(next);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    user: session ? { id: session.id, email: session.email } : null,
    profile,
    role: (session?.role as AppRole) ?? null,
    loading,
  };
}
