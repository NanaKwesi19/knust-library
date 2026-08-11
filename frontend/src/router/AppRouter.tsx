import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { StudentPortal } from '../pages/StudentPortal';
import { AdminDashboard } from '../pages/AdminDashboard';

export const AppRouter: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-knust-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Loading your portal...</p>
        </div>
      </div>
    );
  }

  const isLibraryStaff = user?.role === 'ADMIN' || user?.role === 'LIBRARIAN' || user?.role === 'STAFF';

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" replace />} />
      <Route path="/register" element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/" replace />} />
      <Route
        path="/*"
        element={
          isAuthenticated
            ? (isLibraryStaff ? <AdminDashboard /> : <StudentPortal />)
            : <Navigate to="/login" replace />
        }
      />
    </Routes>
  );
};