// Login.js — keeps /login route alive but redirects to home modal
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    } else {
      navigate('/?auth=login', { replace: true });
    }
  }, [user, navigate]);

  return null;
}