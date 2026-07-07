import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import api from "@/lib/api";
import { useEdith } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";

export type AuthUser = {
  id: string;
  email: string;
  role: "admin" | "user";
  name?: string;
  avatarUrl?: string;
  onboardingCompleted?: boolean;
};

type Ctx = {
  user: AuthUser | null;
  loading: boolean;
  token: string | null;
  gateStage: 1 | 2 | 3 | 4; // 1 = Gate 1, 2 = Gate 2, 3 = Gate 3, 4 = Authenticated
  isPendingApproval: boolean;
  isBlocked: boolean;
  setToken: (token: string | null) => void;
  setPendingApproval: (pending: boolean) => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<Ctx>({
  user: null,
  loading: true,
  token: null,
  gateStage: 1,
  isPendingApproval: false,
  isBlocked: false,
  setToken: () => {},
  setPendingApproval: () => {},
  logout: () => {},
  refreshProfile: async () => {},
});

function parseJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [gateStage, setGateStage] = useState<1 | 2 | 3 | 4>(1); // Start unauthenticated
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const setToken = (newToken: string | null) => {
    if (newToken) {
      localStorage.setItem("edith_token", newToken);
    } else {
      localStorage.removeItem("edith_token");
    }
    setTokenState(newToken);
  };

  const evaluateToken = async (tok: string | null) => {
    if (tok) {
      setGateStage(4);
      await refreshProfile();
    } else {
      setUser(null);
      setGateStage(1);
    }
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    setIsPendingApproval(false);
    setIsBlocked(false);
    setGateStage(1);
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    try {
      const res = await api.auth.profile() as any;
      if (res?.data) {
        const profileUser = res.data;
        setUser({
          id: profileUser.id,
          email: profileUser.email,
          role: profileUser.role,
          name: profileUser.name || profileUser.profile?.name,
          avatarUrl: profileUser.avatarUrl || profileUser.profile?.avatar,
          onboardingCompleted: profileUser.onboardingCompleted,
        });
        if (profileUser.status === "blocked") {
          setIsBlocked(true);
        } else if (profileUser.status === "pending") {
          setIsPendingApproval(true);
        }

        // Sync with Zustand store
        const store = useEdith.getState();
        if (profileUser.profile) {
          let profData = profileUser.profile;
          if (typeof profData === 'string') {
            try { profData = JSON.parse(profData); } catch {}
          }
          if (typeof profData === 'object' && profData !== null) {
            store.setProfile(profData);
          }
        }
        if (profileUser.preferences) {
          let prefs = profileUser.preferences;
          if (typeof prefs === 'string') {
            try { prefs = JSON.parse(prefs); } catch {}
          }
          if (typeof prefs === 'object' && prefs !== null) {
            // Update individual automation rules
            Object.entries(prefs).forEach(([k, v]) => {
              if (typeof v === 'boolean') {
                store.setAutomation(k, v);
              }
            });
            // Update config if present
            const configKeys = ['scanFrequencyHours', 'killRoasBelow', 'scaleRoasAbove'];
            const configPatch: Record<string, number> = {};
            configKeys.forEach((key) => {
              if (key in prefs) {
                configPatch[key] = Number(prefs[key]);
              }
            });
            if (Object.keys(configPatch).length > 0) {
              store.setAutomationConfig(configPatch);
            }
          }
        }
        if (profileUser.paymentSettings) {
          let paySettings = profileUser.paymentSettings;
          if (typeof paySettings === 'string') {
            try { paySettings = JSON.parse(paySettings); } catch {}
          }
          if (typeof paySettings === 'object' && paySettings !== null) {
            store.setPaymentSettings(paySettings);
          }
        }
      }
    } catch (err: any) {
      console.error("Failed to load user profile:", err);
      // Fallback admin user details
      setUser({
        id: "00000000-0000-0000-0000-000000000001",
        email: "admin@edith.local",
        role: "admin",
        name: "EDITH Operator",
        onboardingCompleted: true,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    // 1. Initial check for local session token
    const savedToken = localStorage.getItem("edith_token");
    if (savedToken) {
      setTokenState(savedToken);
      setGateStage(4);
      refreshProfile().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    // 2. Listen to Supabase auth events for Google logins
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Exchange with backend to obtain a secure backend-signed JWT token
        try {
          const res = await api.auth.googleLogin({
            email: session.user.email!,
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.display_name || session.user.email?.split('@')[0],
            supabaseId: session.user.id,
            avatarUrl: session.user.user_metadata?.avatar_url || null
          }) as any;
          if (res?.data?.token) {
            setToken(res.data.token);
            setGateStage(4);
            await refreshProfile();
          }
        } catch (err) {
          console.error("Backend Google Login exchange failed:", err);
          setToken(null);
          setUser(null);
          setGateStage(1);
        }
      } else if (event === 'SIGNED_OUT') {
        setToken(null);
        setUser(null);
        setGateStage(1);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        token,
        gateStage,
        isPendingApproval,
        isBlocked,
        setToken,
        setPendingApproval: setIsPendingApproval,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);