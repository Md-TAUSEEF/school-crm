import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { api, getMessage } from "../services/api";

import {
  connectSocket,
  disconnectSocket,
} from "../services/socket";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =========================
  // CURRENT USER
  // =========================

  const checkAuth = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/auth/me");

      const userData =
        response?.data?.user || null;

      setUser(userData);
    } catch (err) {
      setUser(null);

      if (err?.response?.status !== 401) {
        setError(
          getMessage(
            err,
            "Unable to verify authentication"
          )
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // INITIAL AUTH CHECK
  // =========================

  useEffect(() => {
    checkAuth();
  }, []);

  // =========================
  // REAL-TIME SOCKET
  // =========================

useEffect(() => {
  console.log("AUTH USER:", user);

  const userId = user?._id || user?.id;

  if (!userId) {
    console.log("SOCKET NOT CONNECTING: user id missing");
    disconnectSocket();
    return;
  }

  console.log(
    "Connecting notification socket for user:",
    userId
  );

  connectSocket(userId);

  return () => {
    disconnectSocket();
  };
}, [user?._id, user?.id]);

  // =========================
  // LOGIN
  // =========================

  const login = async (credentials) => {
    try {
      setError("");

      const response = await api.post(
        "/auth/login",
        credentials
      );

      const userData =
        response?.data?.user || null;

      setUser(userData);

      return {
        success: true,
        data: userData,
      };
    } catch (err) {
      const message = getMessage(
        err,
        "Login failed"
      );

      setError(message);

      return {
        success: false,
        message,
      };
    }
  };

  // =========================
  // LOGOUT
  // =========================

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error(
        "Logout error:",
        err?.message
      );
    } finally {
      disconnectSocket();
      setUser(null);
    }
  };

  // =========================
  // AUTH CONTEXT
  // =========================

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        checkAuth,
        isAuthenticated: Boolean(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// =========================
// USE AUTH
// =========================

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
};