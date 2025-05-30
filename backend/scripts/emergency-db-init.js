const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function emergencyDatabaseInit() {
  console.log('🚨 EMERGENCY: Creating production database tables...');
  
  try {
    // First, let's try the standard Prisma approach
    console.log('📋 Step 1: Running Prisma db push...');
    const { execSync } = require('child_process');
    
    try {
      execSync('npx prisma db push --force-reset', { stdio: 'inherit' });
      console.log('✅ Prisma db push completed');
    } catch (error) {
      console.log('⚠️  Prisma db push failed, trying manual table creation...');
      
      // Manual table creation as backup
      console.log('📋 Step 2: Creating tables manually...');
      
      // Create User table
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "User" (
          "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
          "email" TEXT UNIQUE NOT NULL,
          "password" TEXT NOT NULL,
          "displayName" TEXT,
          "businessName" TEXT,
          "businessAddress" TEXT,
          "phoneNumber" TEXT,
          "nationalIdDocument" TEXT,
          "businessRegistrationDocument" TEXT,
          "legalDeclaration" BOOLEAN DEFAULT 0,
          "documentsVerified" BOOLEAN DEFAULT 0,
          "isAdmin" BOOLEAN DEFAULT 0,
          "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // Create Product table
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Product" (
          "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
          "name" TEXT NOT NULL,
          "description" TEXT NOT NULL,
          "price" REAL NOT NULL,
          "category" TEXT NOT NULL,
          "quantity" INTEGER NOT NULL,
          "sku" TEXT,
          "status" TEXT DEFAULT 'active',
          "images" TEXT,
          "delivery" BOOLEAN DEFAULT 0,
          "pickup" TEXT,
          "sizes" TEXT,
          "colors" TEXT,
          "vendorId" TEXT NOT NULL,
          "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("vendorId") REFERENCES "User"("id") ON DELETE CASCADE
        );
      `);
      
      console.log('✅ Tables created manually');
    }
    
    // Verify tables exist
    console.log('📋 Step 3: Verifying tables...');
    const userCount = await prisma.user.count();
    console.log('✅ User table accessible, count:', userCount);
    
    // Create admin user if needed
    if (userCount === 0) {
      console.log('📋 Step 4: Creating admin user...');
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
      
      console.log('✅ Admin user created:', adminUser.email);
      
      // Create sample products
      await prisma.product.createMany({
        data: [
          {
            vendorId: adminUser.id,
            name: 'Stylish T-Shirt',
            category: 'Clothing Collection',
            description: 'Premium cotton t-shirt with modern design',
            price: 2500,
            quantity: 20,
            delivery: true,
            pickup: 'Kigali Store',
            sizes: JSON.stringify(['S', 'M', 'L', 'XL']),
            colors: JSON.stringify(['Black', 'White', 'Blue', 'Red'])
          },
          {
            vendorId: adminUser.id,
            name: 'Running Sneakers',
            category: 'Shoes',
            description: 'Comfortable running shoes with excellent grip',
            price: 8500,
            quantity: 15,
            delivery: true,
            pickup: 'Sports Store',
            sizes: JSON.stringify(['40', '41', '42', '43', '44']),
            colors: JSON.stringify(['Black', 'White', 'Grey'])
          }
        ]
      });
      
      console.log('✅ Sample products created');
    } else {
      console.log('✅ Admin user already exists');
    }
    
    // Final verification
    const finalUserCount = await prisma.user.count();
    const productCount = await prisma.product.count();
    
    console.log('🎉 SUCCESS! Database initialized:');
    console.log(`   👥 Users: ${finalUserCount}`);
    console.log(`   📦 Products: ${productCount}`);
    console.log('');
    console.log('🔐 Login credentials:');
    console.log('   Email: admin@iwanyu.com');
    console.log('   Password: admin123');
    
  } catch (error) {
    console.error('❌ Emergency database init failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  emergencyDatabaseInit()
    .then(() => {
      console.log('✅ Emergency database initialization completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed:', error);
      process.exit(1);
    });
}

module.exports = { emergencyDatabaseInit }; 