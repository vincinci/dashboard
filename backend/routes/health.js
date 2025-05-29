const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/health - Health check endpoint
router.get('/', async (req, res) => {
  try {
    const timestamp = new Date().toISOString();
    
    // Test database connectivity
    let dbStatus = 'unknown';
    let userCount = 0;
    
    try {
      userCount = await prisma.user.count();
      dbStatus = 'connected';
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      dbStatus = 'error';
    }

    const healthData = {
      status: 'ok',
      timestamp,
      database: {
        status: dbStatus,
        userCount: userCount
      },
      env: {
        hasJwtSecret: !!process.env.JWT_SECRET,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        nodeEnv: process.env.NODE_ENV,
        hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN
      }
    };

    res.json(healthData);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      status: 'error', 
      timestamp: new Date().toISOString(),
      error: error.message 
    });
  }
});

module.exports = router; 