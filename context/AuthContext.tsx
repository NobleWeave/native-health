import type { Session, User } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../services/supabase/client";
import * as Location from "expo-location";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  location: { lat: number; lng: number} | null;
  role: "patient" | "provider" | "admin" | null;

  signIn: (
    email: string,
    password: string,
  ) => Promise<{
    error: string | null;
  }>;

  signUp: (
    email: string,
    password: string,
    options?: { data : any }
  ) => Promise<{
    user: User | null;
    error: string | null;
  }>;

  signOut: () => Promise<{
    error: string | null;
  }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [role, setRole] = useState<"patient" | "provider" | "admin" | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchUserRole = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .single();

        if (data?.role && mounted) {
          setRole(data.role);
        }
      } catch (error) {
        console.error("Failed to fetch role from profiles:", error);
      }
    };

    const initializeAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Fallback to metadata for instant UI rendering, then sync with DB
        setRole((session.user.user_metadata?.role as any) || "patient");
        await fetchUserRole(session.user.id);
      }

      setLoading(false);
    };

    const fetchLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (mounted) {
            setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
          }
        } else if (mounted) {
          // Fallback to default (Agartala) if permission denied
          setLocation({ lat: 23.83, lng: 91.28 });
        }
      } catch (error) {
        console.error("Location error:", error);
        if (mounted) {
          setLocation({ lat: 23.83, lng: 91.28 });
        }
      }
    };

    initializeAuth();
    fetchLocation();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setRole((session.user.user_metadata?.role as any) || "patient");
        await fetchUserRole(session.user.id);
      } else {
        setRole(null);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return {
      error: error?.message ?? null,
    };
  };

  const signUp = async (email: string, password: string, options?: { data : any }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options,
    });

    return {
      user: data.user,
      error: error?.message ?? null,
    };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();

    return {
      error: error?.message ?? null,
    };
  };

  // console.log("AuthContext user:", user);
  console.log("User role:", role);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        location,
        role,
        signIn,
        signUp,
        signOut,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
