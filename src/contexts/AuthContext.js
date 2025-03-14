// contexts/AuthContext.js
import { createContext, useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const login = async () => {
      try {
        const { data: userData } = await supabase.auth.signInWithPassword({
          email: "mickeytytnc2@gmail.com",
          password: "12345678",
        });
        setUser(userData.user);
      } catch (err) {
        console.error("Login failed:", err.message);
      } finally {
        setLoading(false);
      }
    };
    login();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};