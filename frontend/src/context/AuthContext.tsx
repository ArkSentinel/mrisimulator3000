import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '../services/api';
import type { User, UserXP } from '../services/api';

interface AuthContextType {
  user: User | null;
  xp: UserXP | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshXP: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [xp, setXP] = useState<UserXP | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (api.isAuthenticated()) {
        try {
          const { user: u, xp: x } = await api.getMe();
          setUser(u);
          setXP(x);
        } catch {
          api.logout();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const { user: u } = await api.login(email, password);
    setUser(u);

    try {
      const { xp: x } = await api.getMe();
      setXP(x);
    } catch {
      setXP({ xp_total: 0, nivel: 1, racha_dias: 0, examenes_totales: 0, ultimo_examen: null });
    }
  };

  const logout = () => {
    api.logout();
    setUser(null);
    setXP(null);
  };

  const refreshXP = async () => {
    try {
      const { xp: x } = await api.getMe();
      setXP(x);
    } catch {
      // XP refresh is non-critical, silently fail
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        xp,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshXP,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
