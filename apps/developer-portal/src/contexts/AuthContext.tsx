import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/api/client';
import { Developer } from '@/types';
import toast from 'react-hot-toast';

interface AuthContextType {
  developer: Developer | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, companyName?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [developer, setDeveloper] = useState<Developer | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('auth_token')
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        try {
          const dev = await apiClient.getCurrentDeveloper();
          setDeveloper(dev);
          setToken(storedToken);
        } catch (error) {
          localStorage.removeItem('auth_token');
          setToken(null);
          setDeveloper(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.login(email, password);
      const accessToken = response.data.accessToken;
      const developer = response.data.developer;
      localStorage.setItem('auth_token', accessToken);
      setToken(accessToken);
      setDeveloper(developer);
      toast.success('Successfully logged in!');
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Login failed';
      toast.error(message);
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string, companyName?: string) => {
    try {
      const response = await apiClient.register(email, password, name, companyName);
      // Registration doesn't return tokens, need to login after
      await login(email, password);
      toast.success('Successfully registered!');
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Registration failed';
      toast.error(message);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setDeveloper(null);
    toast.success('Logged out successfully');
  };

  const value: AuthContextType = {
    developer,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!token && !!developer,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
