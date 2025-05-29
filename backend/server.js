const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const authRouter = require('./routes/auth');
const productsRouter = require('./routes/products');
const uploadRouter = require('./routes/upload');
const adminRouter = require('./routes/admin');
const healthRouter = require('./routes/health');
const debugRouter = require('./routes/debug');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// CORS Configuration
const allowedOrigins = {
  production: [
    'https://dashboard-six-livid-91.vercel.app',
    'https://dashboard-9apwy0d4h-fasts-projects-5b1e7db1.vercel.app',
    'https://dashboard-kj3lfkldu-fasts-projects-5b1e7db1.vercel.app',
    'https://dashboard-vincincis-projects.vercel.app',
    'https://dashboard-git-main-vincincis-projects.vercel.app',
    'https://dashboard-vincinci.vercel.app',
    'https://seller.iwanyustore.store',
    'https://iwanyu-backend.onrender.com',
    process.env.CORS_ORIGIN
  ].filter(Boolean),
  development: ['http://localhost:3000', 'http://localhost:3003']
};

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    const origins = allowedOrigins[process.env.NODE_ENV || 'development'];
    
    // Allow all Vercel deployment URLs for this project in production
    const isVercelURL = origin && (
      origin.includes('fasts-projects-5b1e7db1.vercel.app') ||
      origin.includes('vincincis-projects.vercel.app') ||
      origin.includes('vincinci.vercel.app') ||
      origin.includes('dashboard') && origin.includes('vercel.app')
    );
    
    if (!origin || origins.includes(origin) || isVercelURL) {
      callback(null, true);
    } else {
      console.warn('CORS rejected origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Increase body size limits for file uploads (documents, images)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check endpoint (before API routes)
app.use('/api/health', healthRouter);

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Iwanyu Vendor Dashboard API is running!',
    docs: {
      health: '/api/health',
      auth: '/api/auth',
      products: '/api/products',
      upload: '/api/upload',
      admin: '/api/admin'
    }
  });
});

// Mount routes with /api prefix
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/admin', adminRouter);
app.use('/api/debug', debugRouter);

// Error handling for CORS
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS Error',
      message: 'Origin not allowed',
      allowedOrigins: allowedOrigins[process.env.NODE_ENV || 'development']
    });
  }
  next(err);
});

// Global error handling
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  
  // Handle payload too large errors specifically
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'File too large',
      message: 'The uploaded file exceeds the maximum size limit of 50MB',
      maxSize: '50MB'
    });
  }
  
  res.status(500).json({ 
    error: 'Something broke!', 
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler - this should be the last middleware
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    availableRoutes: [
      '/api/health',
      '/api/auth',
      '/api/products',
      '/api/upload',
      '/api/admin'
    ]
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 API available at http://localhost:${PORT}`);
  console.log(`🏥 Health check at http://localhost:${PORT}/api/health`);
});

// Export the app
module.exports = app; 