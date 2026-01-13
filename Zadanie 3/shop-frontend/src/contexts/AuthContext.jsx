import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { http, setupInterceptors } from "../api/http";

const AuthContext = createContext(null);

const STORAGE_KEY = "shop_auth_v1";

function safeParse(json) {
    try { return JSON.parse(json); } catch { return null; }
}

export function AuthProvider({ children }) {
    const [auth, setAuth] = useState(() => {
        const fromStorage = safeParse(localStorage.getItem(STORAGE_KEY));
        return (
            fromStorage || {
                accessToken: null,
                refreshToken: null,
                user: null, // np. { username, role }
            }
        );
    });

    const getAuthState = () => auth;

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
        // backend: POST /login { username, password }
        const res = await http.post("/login", { username, password });
        const { accessToken, refreshToken, user } = res.data || {};

        // Jeśli backend nie zwraca user/role, to spróbuj wywnioskować po username (admin -> employee)
        const normalizedUser =
            user || { username, role: username === "admin" ? "EMPLOYEE" : "CUSTOMER" };

        setAuth({ accessToken, refreshToken, user: normalizedUser });
    };

    const value = useMemo(
        () => ({
            auth,
            setAuth,
            login,
            logout,
            isLoggedIn: !!auth?.accessToken,
            isEmployee: auth?.user?.role === "EMPLOYEE" || auth?.user?.username === "admin",
        }),
        [auth]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
