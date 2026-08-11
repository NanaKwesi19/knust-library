import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { AuthUser, AuthState } from '../types/auth.js';

interface AuthContextType extends AuthState {
  login: (token: string, userData: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function isValidUser(user: any): user is AuthUser {
  return (
    user &&
    typeof user.id === 'number' &&
    typeof user.userUuid === 'string' &&
    typeof user.fullName === 'string' &&
    typeof user.email === 'string' &&
    typeof user.role === 'string' &&
    ['STUDENT', 'STAFF', 'LIBRARIAN', 'ADMIN'].includes(user.role)
  );
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    const initializeAuth = () => {
      const token = localStorage.getItem('knust_lib_token');
      const storedUser = localStorage.getItem('knust_lib_user');

      if (token && storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (isValidUser(parsed)) {
            setState({
              user: parsed,
              token,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            console.warn('Invalid auth data in localStorage, clearing');
            localStorage.removeItem('knust_lib_token');
            localStorage.removeItem('knust_lib_user');
            setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
          }
        } catch (error) {
          console.error('Failed to parse stored user session data:', error);
          localStorage.removeItem('knust_lib_token');
          localStorage.removeItem('knust_lib_user');
          setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
        }
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    initializeAuth();
  }, []);

  const login = (token: string, userData: AuthUser) => {
    localStorage.setItem('knust_lib_token', token);
    localStorage.setItem('knust_lib_user', JSON.stringify(userData));
    
    setState({
      user: userData,
      token,
      isAuthenticated: true,
      isLoading: false,
    });
  };

  const logout = () => {
    localStorage.removeItem('knust_lib_token');
    localStorage.removeItem('knust_lib_user');
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {!state.isLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be executed within an explicit AuthProvider wrapper.');
  }
  return context;
};