import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { 
      const stored = localStorage.getItem('ww_user');
      if (!stored || stored === 'undefined') return null;
      return JSON.parse(stored); 
    } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ww_token');
    if (token && token !== 'undefined') {
      api.get('/auth/me')
        .then((r) => { 
          if (r.data && r.data.id) {
            setUser(r.data); 
            localStorage.setItem('ww_user', JSON.stringify(r.data)); 
          } else {
            throw new Error("Invalid user data");
          }
        })
        .catch(() => { 
          localStorage.removeItem('ww_token'); 
          localStorage.removeItem('ww_user'); 
          setUser(null); 
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('ww_token', token);
    localStorage.setItem('ww_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('ww_token');
    localStorage.removeItem('ww_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
