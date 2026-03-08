import React, { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [trustScore, setTrustScore] = useState(100);
    const [accessToken, setAccessToken] = useState(() => sessionStorage.getItem('accessToken'));

    const login = useCallback(({ user, trustScore, accessToken }) => {
        setUser(user);
        setTrustScore(trustScore ?? 100);
        setAccessToken(accessToken);
        if (accessToken) sessionStorage.setItem('accessToken', accessToken);
    }, []);

    const logout = useCallback(async () => {
        try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch { }
        sessionStorage.removeItem('accessToken');
        setUser(null);
        setAccessToken(null);
        setTrustScore(100);
        window.location.href = '/login';
    }, []);

    return (
        <AuthContext.Provider value={{ user, trustScore, setTrustScore, accessToken, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
