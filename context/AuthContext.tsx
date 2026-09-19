import React, { createContext, useContext, useMemo, useState } from "react";

type UserProfile = {
  name: string;
  email: string;
  age?: string;
  bloodGroup?: string;
  allergies?: string;
  conditions?: string;
  medications?: string;
  emergencyContact?: string;
};

type AuthContextValue = {
  user: UserProfile | null;
  pendingSignup: { name: string; email: string } | null;
  login: (email: string, password: string) => boolean;
  startSignup: (name: string, email: string) => void;
  finishOnboarding: (profile: Omit<UserProfile, "name" | "email">) => void;
  logout: () => void;
};

// Temporary credentials until Supabase Auth is connected.
export const DEMO_USERNAME = "demo@careflow.com";
export const DEMO_PASSWORD = "CareFlow123";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [pendingSignup, setPendingSignup] = useState<{
    name: string;
    email: string;
  } | null>(null);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      pendingSignup,

      login: (email, password) => {
        const valid = email.trim().toLowerCase() === DEMO_USERNAME && password === DEMO_PASSWORD;

        if (valid) {
          setUser({ name: "Demo User", email: DEMO_USERNAME });
        }

        return valid;
      },

      startSignup: (name, email) => {
        setPendingSignup({ name: name.trim(), email: email.trim().toLowerCase() });
      },

      finishOnboarding: (profile) => {
        if (!pendingSignup) return;

        setUser({
          name: pendingSignup.name,
          email: pendingSignup.email,
          ...profile,
        });
        setPendingSignup(null);
      },

      logout: () => {
        setUser(null);
        setPendingSignup(null);
      },
    }),
    [pendingSignup, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
