const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { Prisma } = require('@prisma/client');
const { emergencyDatabaseInit } = require('../scripts/emergency-db-init');

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

// GET /api/debug/fix-schema - Fix database schema sync issues
router.get('/fix-schema', async (req, res) => {
  try {
    console.log('🔄 Checking and fixing database schema...');
    
    // Array to track which columns were added
    const addedColumns = [];
    
    // Try to add missing columns one by one
    const columnsToAdd = [
      { name: 'sku', type: 'TEXT' },
      { name: 'status', type: 'TEXT DEFAULT \'active\'' },
      { name: 'updatedAt', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
      { name: 'createdAt', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
    ];
    
    for (const column of columnsToAdd) {
      try {
        await prisma.$executeRaw`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS ${Prisma.raw(`"${column.name}" ${column.type}`)};`;
        addedColumns.push(column.name);
        console.log(`✅ Added ${column.name} column to Product table`);
      } catch (error) {
        console.log(`ℹ️ ${column.name} column might already exist:`, error.message);
      }
    }
    
    // Test the Product table structure by querying it
    try {
      const products = await prisma.product.findMany({
        take: 1
      });
      console.log('✅ Product table structure is now correct!');
      
      res.json({
        status: 'success',
        message: 'Database schema sync completed',
        addedColumns: addedColumns,
        productCount: products.length
      });
    } catch (testError) {
      console.error('❌ Schema test failed:', testError);
      
      res.status(500).json({
        status: 'error',
        error: testError.message,
        addedColumns: addedColumns,
        message: 'Some columns were added but there may still be issues'
      });
    }
    
  } catch (error) {
    console.error('❌ Schema sync failed:', error);
    
    res.status(500).json({
      status: 'error',
      error: error.message,
      code: error.code
    });
  }
});

// GET /api/debug/make-admin - Update admin user to have admin privileges
router.get('/make-admin', async (req, res) => {
  try {
    console.log('🔄 Updating admin@iwanyu.com to have admin privileges...');
    
    const updatedUser = await prisma.user.update({
      where: { email: 'admin@iwanyu.com' },
      data: { 
        isAdmin: true,
        documentsVerified: true 
      }
    });
    
    res.json({
      status: 'success',
      message: 'Admin user updated successfully',
      admin: {
        email: updatedUser.email,
        isAdmin: updatedUser.isAdmin,
        documentsVerified: updatedUser.documentsVerified
      }
    });
    
  } catch (error) {
    console.error('❌ Admin fix failed:', error);
    
    res.status(500).json({
      status: 'error',
      error: error.message,
      code: error.code
    });
  }
});

// GET /api/debug/test-products - Test products endpoint without auth
router.get('/test-products', async (req, res) => {
  try {
    console.log('Testing products endpoint...');
    
    // Get all products count
    const totalProducts = await prisma.product.count();
    console.log(`Total products in database: ${totalProducts}`);
    
    // Get first few products
    const products = await prisma.product.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        vendor: {
          select: {
            id: true,
            email: true,
            displayName: true,
            businessName: true
          }
        }
      }
    });
    
    console.log(`Found ${products.length} products`);
    
    res.json({
      status: 'success',
      totalProducts,
      sampleProducts: products.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        vendor: p.vendor
      }))
    });
    
  } catch (error) {
    console.error('❌ Test products error:', error);
    
    res.status(500).json({
      status: 'error',
      error: error.message,
      code: error.code
    });
  }
});

// Debug endpoint to check database status
router.get('/db-status', async (req, res) => {
  try {
    const userCount = await prisma.user.count();
    const productCount = await prisma.product.count();
    
    res.json({
      status: 'success',
      database: {
        tablesExist: true,
        userCount,
        productCount
      }
    });
  } catch (error) {
    res.json({
      status: 'error',
      database: {
        tablesExist: false,
        error: error.message,
        code: error.code
      }
    });
  }
});

// Emergency database initialization endpoint (for free plan users)
router.post('/init-database', async (req, res) => {
  try {
    console.log('🚨 Manual database initialization triggered via API...');
    await emergencyDatabaseInit();
    
    res.json({
      status: 'success',
      message: 'Database initialized successfully',
      credentials: {
        email: 'admin@iwanyu.com',
        password: 'admin123'
      }
    });
  } catch (error) {
    console.error('❌ Manual database initialization failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Database initialization failed',
      error: error.message
    });
  }
});

module.exports = router; 