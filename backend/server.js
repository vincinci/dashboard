const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const authRouter = require('./routes/auth');
const productsRouter = require('./routes/products');
const uploadRouter = require('./routes/upload');
const adminRouter = require('./routes/admin');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://dashboard-six-livid-91.vercel.app'] 
    : ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Iwanyu Vendor Dashboard API is running!' });
});

// Mount routes with /api prefix
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/admin', adminRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    env: {
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      nodeEnv: process.env.NODE_ENV,
      hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({ error: 'Something broke!', details: err.message });
});

// 404 handler - this should be the last middleware
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Only start the server if we're not in Vercel
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 API available at http://localhost:${PORT}`);
  });
}

// Export the app for Vercel
module.exports = app; 