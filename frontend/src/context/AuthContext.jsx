import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api, clearToken, readToken, saveToken } from "@/lib/api";


const AuthContext = createContext(null);


export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setLoading(false);
  }, []);

  const refreshUser = useCallback(async () => {
    const response = await api.get("/auth/me");
    setUser(response.data);
    return response.data;
  }, []);

  useEffect(() => {
    const token = readToken();
    if (!token) {
      setLoading(false);
      return;
    }

    refreshUser()
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [logout, refreshUser]);

  const handleAuthResponse = useCallback((data) => {
    saveToken(data.access_token);
    setUser(data.user);
    return data;
  }, []);

  const login = useCallback(async (payload) => {
    const response = await api.post("/auth/login", payload);
    return handleAuthResponse(response.data);
  }, [handleAuthResponse]);

  const register = useCallback(async (payload) => {
    const response = await api.post("/auth/register", payload);
    return handleAuthResponse(response.data);
  }, [handleAuthResponse]);

  const markHasChart = useCallback(() => {
    setUser((currentUser) => (currentUser ? { ...currentUser, has_chart: true } : currentUser));
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout,
    refreshUser,
    markHasChart,
  }), [login, loading, logout, markHasChart, refreshUser, register, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}


export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}