import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { http, setupInterceptors } from "../api/http";

const AuthContext = createContext(null);
const STORAGE_KEY = "shop_auth_v1";

function safeParse(json) {
    try { return JSON.parse(json); } catch { return null; }
}

export function AuthProvider({ children }) {
    const [auth, setAuth] = useState(() => {
        const fromStorage = safeParse(localStorage.getItem(STORAGE_KEY));
        return fromStorage || { accessToken: null, refreshToken: null, user: null };
    });

    // 👇 klucz: ref zawsze ma najnowszy auth
    const authRef = useRef(auth);
    useEffect(() => {
        authRef.current = auth;
    }, [auth]);

    const getAuthState = () => authRef.current;

    const logout = () => {
        setAuth({ accessToken: null, refreshToken: null, user: null });
        localStorage.removeItem(STORAGE_KEY);
    };

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    }, [auth]);

    useEffect(() => {
        setupInterceptors(getAuthState, setAuth, logout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const login = async (username, password) => {
        const res = await http.post("/login", { username, password });
        const { accessToken, refreshToken, user } = res.data || {};
        setAuth({ accessToken, refreshToken, user });
    };

    const value = useMemo(() => ({
        auth,
        setAuth,
        login,
        logout,
        isLoggedIn: !!auth?.accessToken,
        isEmployee: auth?.user?.role === "PRACOWNIK",
    }), [auth]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}