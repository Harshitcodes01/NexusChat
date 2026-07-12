import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authService, type AuthResponse } from '../services/authService';

export interface User {
  id: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  avatar: string;
  bio: string;
  status: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string | undefined, phoneNumber: string | undefined, password: string) => Promise<any>;
  verifyOtpAndLogin: (phoneNumber: string, otpCode: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('nexuschat_token'));
  const [isLoading, setIsLoading] = useState(true);

  // On mount, try to load user from token
  useEffect(() => {
    const loadUser = async () => {
      const storedToken = localStorage.getItem('nexuschat_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await authService.getMe();
        setUser(res.data.user);
        setToken(storedToken);
      } catch {
        localStorage.removeItem('nexuschat_token');
        localStorage.removeItem('nexuschat_user');
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authService.login({ email, password });
    const data: AuthResponse = res.data;
    localStorage.setItem('nexuschat_token', data.token);
    localStorage.setItem('nexuschat_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  }, []);

  const verifyOtpAndLogin = useCallback(async (phoneNumber: string, otpCode: string) => {
    const res = await authService.verifyOTP(phoneNumber, otpCode);
    const data: AuthResponse = res.data;
    localStorage.setItem('nexuschat_token', data.token);
    localStorage.setItem('nexuschat_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(async (name: string, email: string | undefined, phoneNumber: string | undefined, password: string): Promise<any> => {
    const res = await authService.register({ name, email, phoneNumber, password });
    return res.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Even if API call fails, clear local state
    }
    localStorage.removeItem('nexuschat_token');
    localStorage.removeItem('nexuschat_user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        register,
        verifyOtpAndLogin,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
