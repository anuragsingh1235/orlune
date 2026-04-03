// Register.js — keeps /register route alive but redirects to home modal
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    } else {
      navigate('/?auth=register', { replace: true });
    }
  }, [user, navigate]);

  return null;
}