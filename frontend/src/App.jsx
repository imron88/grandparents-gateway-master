import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';

// Pages
import Enroll from './pages/Enroll.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import GuardianDashboard from './pages/GuardianDashboard.jsx';
import Recovery from './pages/Recovery.jsx';

function ProtectedRoute({ children, requiredRole }) {
    const { isAuthenticated, user } = useAuth();
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (requiredRole && user?.role !== requiredRole) return <Navigate to="/dashboard" replace />;
    return children;
}

function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/enroll" element={<Enroll />} />
            <Route path="/login" element={<Login />} />
            <Route path="/recovery" element={<Recovery />} />
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute requiredRole="senior">
                        <Dashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/guardian"
                element={
                    <ProtectedRoute requiredRole="guardian">
                        <GuardianDashboard />
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <AppRoutes />
            </BrowserRouter>
        </AuthProvider>
    );
}
