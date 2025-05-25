import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const email = e.target.email.value;
    const password = e.target.password.value;

    console.log('Attempting login...');
    const result = await login(email, password);
    console.log('Login result:', result);

    if (result.success) {
      console.log('Login successful, navigating to dashboard...');
      navigate('/dashboard');
    } else {
      console.error('Login failed:', result.error);
      setError(result.error);
    }
    setLoading(false);
  };

  // ... rest of the component ...
}

export default Login; 