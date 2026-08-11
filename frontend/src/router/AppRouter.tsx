import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { StaffRegisterPage } from '../pages/StaffRegisterPage';
import StudentPortal from '../pages/StudentPortal';
import { AdminCommandCenter } from '../pages/AdminCommandCenter';

export const AppRouter: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="text-sm font-semibold text-slate-500">Loading your portal...</div></div>;
  }

  return <Routes>
    <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
    <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />} />
    <Route path="/staff-register" element={isAuthenticated ? <Navigate to="/" replace /> : <StaffRegisterPage />} />
    <Route path="/" element={isAuthenticated ? (user?.role === 'ADMIN' ? <AdminCommandCenter /> : <StudentPortal />) : <Navigate to="/login" replace />} />
    <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
  </Routes>;
};
