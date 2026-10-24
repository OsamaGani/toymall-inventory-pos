import { createContext, useContext, useEffect, useState } from "react";

const AdminAuthContext = createContext(null);

const ADMIN_TOKEN_KEY = "toymall_admin_token";
const ADMIN_DATA_KEY = "toymall_admin";

export function AdminAuthProvider({ children }) {
  const [token, setToken] = useState(
    () => localStorage.getItem(ADMIN_TOKEN_KEY)
  );

  const [admin, setAdmin] = useState(() => {
    const savedAdmin = localStorage.getItem(ADMIN_DATA_KEY);

    if (!savedAdmin) {
      return null;
    }

    try {
      return JSON.parse(savedAdmin);
    } catch {
      localStorage.removeItem(ADMIN_DATA_KEY);
      return null;
    }
  });

  const login = (adminToken, adminData) => {
    localStorage.setItem(ADMIN_TOKEN_KEY, adminToken);
    localStorage.setItem(
      ADMIN_DATA_KEY,
      JSON.stringify(adminData)
    );

    setToken(adminToken);
    setAdmin(adminData);
  };

  const logout = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_DATA_KEY);

    setToken(null);
    setAdmin(null);
  };

  useEffect(() => {
    if (!token) {
      setAdmin(null);
    }
  }, [token]);

  const isAuthenticated = Boolean(token && admin);

  const authHeaders = token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};

  return (
    <AdminAuthContext.Provider
      value={{
        token,
        admin,
        isAuthenticated,
        authHeaders,
        login,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);

  if (!context) {
    throw new Error(
      "useAdminAuth must be used inside AdminAuthProvider"
    );
  }

  return context;
}