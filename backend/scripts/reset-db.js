const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function resetDatabase() {
  try {
    console.log('🔄 Starting database reset and schema recreation...');
    
    // Test connection
    console.log('📡 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Force reset and recreate schema
    console.log('🔄 Applying database schema...');
    
    // This will drop and recreate all tables
    await prisma.$executeRawUnsafe('DROP SCHEMA public CASCADE');
    await prisma.$executeRawUnsafe('CREATE SCHEMA public');
    
    console.log('✅ Schema reset complete');
    
    // Reconnect and apply schema
    await prisma.$disconnect();
    await prisma.$connect();
    
    // Use Prisma's internal schema sync
    console.log('📋 Applying Prisma schema...');
    
    // Create tables manually based on our schema
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "User" (
        "id" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "password" TEXT NOT NULL,
        "displayName" TEXT NOT NULL,
        "businessName" TEXT,
        "businessAddress" TEXT,
        "phoneNumber" TEXT,
        "nationalIdDocument" TEXT,
        "businessRegistrationDocument" TEXT,
        "legalDeclaration" BOOLEAN NOT NULL DEFAULT false,
        "isAdmin" BOOLEAN NOT NULL DEFAULT false,
        "documentsVerified" BOOLEAN NOT NULL DEFAULT false,
        "resetPasswordToken" TEXT,
        "resetPasswordExpires" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        
        CONSTRAINT "User_pkey" PRIMARY KEY ("id")
      );
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "Product" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "price" DOUBLE PRECISION NOT NULL,
        "category" TEXT NOT NULL,
        "quantity" INTEGER NOT NULL DEFAULT 0,
        "sku" TEXT,
        "status" TEXT NOT NULL DEFAULT 'active',
        "images" TEXT,
        "delivery" BOOLEAN NOT NULL DEFAULT false,
        "pickup" TEXT,
        "vendorId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        
        CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
      );
    `);
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Product" ADD CONSTRAINT "Product_vendorId_fkey" 
      FOREIGN KEY ("vendorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `);
    
    console.log('✅ Database schema created successfully');
    
    // Create admin user
    console.log('👤 Creating admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const adminUser = await prisma.user.create({
      data: {
        id: 'admin-user-id-001',
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
    
    console.log('✅ Admin user created:', {
      id: adminUser.id,
      email: adminUser.email,
      displayName: adminUser.displayName
    });
    
    console.log('🎉 Database reset and initialization completed successfully!');
    
  } catch (error) {
    console.error('❌ Database reset failed:', {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack
    });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabase(); 