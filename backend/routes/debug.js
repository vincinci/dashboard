const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/debug/db - Test database connection
router.get('/db', async (req, res) => {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    console.log('Attempting to connect to database...');
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test user count
    console.log('Attempting to count users...');
    const userCount = await prisma.user.count();
    console.log(`✅ User count: ${userCount}`);
    
    // Test if admin exists
    console.log('Checking for admin user...');
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@iwanyu.com' }
    });
    console.log(`✅ Admin exists: ${!!adminUser}`);
    
    res.json({
      status: 'success',
      database: {
        connected: true,
        userCount: userCount,
        adminExists: !!adminUser
      },
      env: {
        hasJwtSecret: !!process.env.JWT_SECRET,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        nodeEnv: process.env.NODE_ENV
      }
    });
    
  } catch (error) {
    console.error('❌ Database test error:', error);
    
    res.status(500).json({
      status: 'error',
      error: error.message,
      code: error.code,
      details: {
        name: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : 'Hidden in production'
      }
    });
  }
});

// GET /api/debug/create-admin - Force create admin user
router.get('/create-admin', async (req, res) => {
  try {
    const bcrypt = require('bcrypt');
    
    console.log('Attempting to create admin user...');
    
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@iwanyu.com' }
    });
    
    if (existingAdmin) {
      return res.json({
        status: 'exists',
        message: 'Admin user already exists',
        admin: {
          id: existingAdmin.id,
          email: existingAdmin.email,
          displayName: existingAdmin.displayName
        }
      });
    }
    
    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@iwanyu.com',
        password: hashedPassword,
        displayName: 'Admin User',
        businessName: 'Iwanyu Administration',
        businessAddress: 'Kigali, Rwanda',
        phoneNumber: '+250 XXX XXX XXX',
        nationalIdDocument: 'admin-verified',
        businessRegistrationDocument: 'admin-verified',
        legalDeclaration: true,
        isAdmin: true,
        documentsVerified: true
      }
    });
    
    console.log('✅ Admin user created successfully');
    
    res.json({
      status: 'created',
      message: 'Admin user created successfully',
      admin: {
        id: adminUser.id,
        email: adminUser.email,
        displayName: adminUser.displayName
      }
    });
    
  } catch (error) {
    console.error('❌ Create admin error:', error);
    
    res.status(500).json({
      status: 'error',
      error: error.message,
      code: error.code
    });
  }
});

// GET /api/debug/schema - Check actual database schema
router.get('/schema', async (req, res) => {
  try {
    console.log('Checking database schema...');
    
    // Get table information
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      ORDER BY ordinal_position;
    `;
    
    res.json({
      status: 'success',
      table: 'User',
      columns: columns,
      message: 'Schema information retrieved successfully'
    });
    
  } catch (error) {
    console.error('❌ Schema check error:', error);
    
    res.status(500).json({
      status: 'error',
      error: error.message,
      code: error.code
    });
  }
});

// GET /api/debug/raw-user - Test raw user query
router.get('/raw-user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    console.log(`Checking for user: ${email}`);
    
    // Use raw SQL to avoid Prisma schema mismatch
    const users = await prisma.$queryRaw`
      SELECT * FROM "User" WHERE email = ${email};
    `;
    
    res.json({
      status: 'success',
      users: users,
      count: users.length
    });
    
  } catch (error) {
    console.error('❌ Raw user query error:', error);
    
    res.status(500).json({
      status: 'error',
      error: error.message,
      code: error.code
    });
  }
});

// GET /api/debug/fix-schema - Add missing columns
router.get('/fix-schema', async (req, res) => {
  try {
    console.log('Fixing database schema...');
    
    // Add missing documentsVerified column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS "documentsVerified" BOOLEAN NOT NULL DEFAULT false;
    `);
    
    console.log('✅ Added documentsVerified column');
    
    // Verify the schema is now correct
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      ORDER BY ordinal_position;
    `;
    
    res.json({
      status: 'success',
      message: 'Schema fixed successfully',
      columns: columns
    });
    
  } catch (error) {
    console.error('❌ Schema fix error:', error);
    
    res.status(500).json({
      status: 'error',
      error: error.message,
      code: error.code
    });
  }
});

module.exports = router; 