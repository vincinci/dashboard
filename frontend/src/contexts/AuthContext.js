import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import API_CONFIG from '../config/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null);

  // Clear any stale data on app start
  useEffect(() => {
    // Clear old authentication data
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  // Set up axios interceptor for auth token
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Check API health and user auth on app load
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const healthResponse = await axios.get(API_CONFIG.getURL('/health'), {
          timeout: API_CONFIG.TIMEOUT
        });
        console.log('API Health:', healthResponse.data);
        
        if (token) {
          try {
            const response = await axios.get(API_CONFIG.getURL('/auth/me'), {
              timeout: API_CONFIG.TIMEOUT
            });
            setUser(response.data);
          } catch (error) {
            console.error('Auth check failed:', error);
            if (error.response?.status === 401) {
              logout();
            }
          }
        }
      } catch (error) {
        console.error('API Health check failed:', error);
        setError(`Unable to connect to server at ${API_CONFIG.getBaseURL()}. Please ensure the backend is running.`);
      } finally {
        setLoading(false);
      }
    };
    
    checkHealth();
  }, [token]);

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await axios.post(API_CONFIG.getURL('/auth/login'), {
        email,
        password
      }, {
        timeout: API_CONFIG.TIMEOUT,
        headers: API_CONFIG.DEFAULT_HEADERS
      });

      const { user: userData, token: authToken } = response.data;
      
      setUser(userData);
      setToken(authToken);
      localStorage.setItem('authToken', authToken);
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Login failed. Please check your credentials.';
      
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        errorMessage = `Cannot connect to server at ${API_CONFIG.getBaseURL()}. Please ensure the backend is running.`;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      setError(errorMessage);
      return { 
        success: false, 
        error: errorMessage
      };
    }
  };

  const register = async (userData) => {
    try {
      setError(null);
      const response = await axios.post(API_CONFIG.getURL('/auth/register'), userData, {
        timeout: API_CONFIG.TIMEOUT,
        headers: API_CONFIG.DEFAULT_HEADERS
      });
      
      const { user: newUser, token: authToken } = response.data;
      
      setUser(newUser);
      setToken(authToken);
      localStorage.setItem('authToken', authToken);
      
      return { success: true };
    } catch (error) {
      let errorMessage = 'Registration failed';
      
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        errorMessage = `Cannot connect to server at ${API_CONFIG.getBaseURL()}. Please ensure the backend is running.`;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      setError(errorMessage);
      return { 
        success: false, 
        error: errorMessage
      };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
    delete axios.defaults.headers.common['Authorization'];
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put(API_CONFIG.getURL('/auth/profile'), profileData, {
        timeout: API_CONFIG.TIMEOUT
      });
      setUser(response.data);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Profile update failed' 
      };
    }
  };

  const updateUser = (userData) => {
    setUser(userData);
  };

  const value = {
    user,
    token,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    updateUser,
    isAuthenticated: !!(user || token),
    apiConfig: API_CONFIG
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 