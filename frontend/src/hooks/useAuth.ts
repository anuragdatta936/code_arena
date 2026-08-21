import { useState, useEffect } from 'react';

interface User {
  id: number;
  username: string;
  email: string;
  rating?: number;
  totalSubmissions?: number;
  acceptedSubmissions?: number;
  joinDate?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('token'),
    isLoading: true,
  });

  // Initialize auth state on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // In a real app, we would verify the token and fetch user data
      // For now, we'll simulate with mock data
      const mockUser: User = {
        id: 1,
        username: 'codearena_user',
        email: 'user@example.com',
        rating: 1200,
        totalSubmissions: 42,
        acceptedSubmissions: 28,
        joinDate: '2026-01-15',
      };
      setAuthState({
        user: mockUser,
        token,
        isLoading: false,
      });
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = async (_email: string, _password: string) => {
    try {
      // In a real app, this would call the login API
      // For now, we'll simulate a successful login
      setAuthState({
        user: {
          id: 1,
          username: 'codearena_user',
          email: 'user@example.com',
          rating: 1200,
          totalSubmissions: 42,
          acceptedSubmissions: 28,
          joinDate: '2026-01-15',
        },
        token: 'mock-jwt-token',
        isLoading: false,
      });
      localStorage.setItem('token', 'mock-jwt-token');
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setAuthState({
      user: null,
      token: null,
      isLoading: false,
    });
    localStorage.removeItem('token');
  };

  const register = async (_username: string, _email: string, _password: string) => {
    try {
      // In a real app, this would call the register API
      // For now, we'll simulate a successful registration
      setAuthState({
        user: {
          id: Date.now(), // Mock ID
          username: _username,
          email: _email,
          rating: 0,
          totalSubmissions: 0,
          acceptedSubmissions: 0,
          joinDate: new Date().toISOString().split('T')[0],
        },
        token: 'mock-jwt-token',
        isLoading: false,
      });
      localStorage.setItem('token', 'mock-jwt-token');
    } catch (error) {
      throw error;
    }
  };

  return {
    ...authState,
    login,
    logout,
    register,
    isAuthenticated: !!authState.token,
  };
};

export default useAuth;