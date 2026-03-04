import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export function useAuth() {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get current session on mount
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // Listen for login / logout events
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);

      // On first login — upsert user profile into our users table
      if (u) {
        supabase.from("users").upsert({
          id:         u.id,
          email:      u.email!,
          name:       u.user_metadata?.full_name ?? null,
          avatar_url: u.user_metadata?.avatar_url ?? null,
        }, { onConflict: "id" });
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,   // back to your app after login
      },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return { user, loading, signInWithGoogle, signOut };
}