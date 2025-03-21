import { createContext, useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);

      // ตรวจสอบ session expiration
      if (session?.expires_at) {
        const expiresAt = new Date(session.expires_at * 1000);
        const now = new Date();

        if (expiresAt <= now) {
          await supabase.auth.signOut();
          setUser(null);
          navigate("/");
        } else {
          // ตั้ง timer สำหรับ auto logout
          const timeoutId = setTimeout(async () => {
            await supabase.auth.signOut();
            setUser(null);
            navigate("/");
          }, expiresAt - now);

          return () => clearTimeout(timeoutId);
        }
      }
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth event:", event);
        setUser(session?.user ?? null);
        setLoading(false);

        // จัดการกรณี token หมดอายุ
        if (event === "TOKEN_REFRESHED") {
          checkSession();
        } else if (event === "SIGNED_OUT") {
          navigate("/");
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
