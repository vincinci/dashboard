// API Configuration
const API_CONFIG = {
  // Development ports
  DEV_API_PORT: process.env.REACT_APP_API_PORT || '3001',
  DEV_FRONTEND_PORT: process.env.REACT_APP_FRONTEND_PORT || '3003',
  
  // Production URLs
  PROD_API_URL: process.env.REACT_APP_PROD_API_URL || 'https://iwanyu-api.onrender.com/api',
  
  // Get base URL based on environment
  getBaseURL: () => {
    const isProduction = process.env.NODE_ENV === 'production';
    let baseURL;
    
    if (isProduction) {
      baseURL = API_CONFIG.PROD_API_URL;
    } else {
      // For development, use dynamic port
      const apiPort = API_CONFIG.DEV_API_PORT;
      baseURL = `http://localhost:${apiPort}/api`;
    }
    
    // Debug log to help troubleshoot
    console.log(`[API_CONFIG] Environment: ${process.env.NODE_ENV || 'development'}, Using API URL: ${baseURL}`);
    return baseURL;
  },
  
  // Get full API URL for specific endpoint
  getURL: (endpoint) => {
    const baseURL = API_CONFIG.getBaseURL();
    return `${baseURL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  },
  
  // Request timeout
  TIMEOUT: 10000,
  
  // Default headers
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
  }
};

export default API_CONFIG; 