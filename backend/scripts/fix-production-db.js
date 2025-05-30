const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function fixProductionDatabase() {
  try {
    console.log('🔄 Fixing production database...');
    console.log('📊 Environment:', process.env.NODE_ENV);
    console.log('🔗 Database URL:', process.env.DATABASE_URL ? 'Set' : 'Missing');

    // First, try to create the database schema
    console.log('🛠️  Creating database schema...');
    
    // Use raw SQL to create tables if they don't exist
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT NOT NULL,
        "password" TEXT NOT NULL,
        "displayName" TEXT,
        "businessName" TEXT,
        "businessAddress" TEXT,
        "phoneNumber" TEXT,
        "nationalIdDocument" TEXT,
        "businessRegistrationDocument" TEXT,
        "legalDeclaration" BOOLEAN NOT NULL DEFAULT false,
        "documentsVerified" BOOLEAN NOT NULL DEFAULT false,
        "isAdmin" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")
    `;

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Product" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "price" REAL NOT NULL,
        "category" TEXT NOT NULL,
        "quantity" INTEGER NOT NULL,
        "sku" TEXT,
        "status" TEXT NOT NULL DEFAULT 'active',
        "images" TEXT,
        "delivery" BOOLEAN NOT NULL DEFAULT false,
        "pickup" TEXT,
        "sizes" TEXT,
        "colors" TEXT,
        "vendorId" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("vendorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `;

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "Product_vendorId_idx" ON "Product"("vendorId")
    `;

    console.log('✅ Database schema created successfully');

    // Check if admin user already exists
    let adminUser;
    try {
      adminUser = await prisma.user.findUnique({
        where: { email: 'admin@iwanyu.com' }
      });
    } catch (error) {
      console.log('⚠️  User table might be empty, will create admin user');
    }

    if (!adminUser) {
      // Create admin user
      console.log('👤 Creating admin user...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      adminUser = await prisma.user.create({
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
    } else {
      console.log('✅ Admin user already exists:', adminUser.email);
    }

    // Create sample products for admin
    const existingProducts = await prisma.product.count({
      where: { vendorId: adminUser.id }
    });

    if (existingProducts === 0) {
      console.log('📦 Creating sample products...');
      
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
      console.log('✅ Products already exist, skipping creation');
    }

    // Verify the database
    const userCount = await prisma.user.count();
    const productCount = await prisma.product.count();

    console.log('📊 Database verification:');
    console.log(`   Users: ${userCount}`);
    console.log(`   Products: ${productCount}`);

    console.log('🎉 Production database fixed successfully!');

  } catch (error) {
    console.error('❌ Error fixing production database:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  fixProductionDatabase()
    .then(() => {
      console.log('✅ Database fix completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixProductionDatabase }; 