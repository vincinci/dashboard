const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateProductionDB() {
  console.log('🔧 Starting production database migration...');
  
  try {
    // Add missing columns to Product table
    console.log('📋 Adding missing columns to Product table...');
    
    const migrations = [
      // Add sizes column if it doesn't exist
      `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sizes" TEXT;`,
      
      // Add colors column if it doesn't exist  
      `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "colors" TEXT;`,
      
      // Add verification columns if they don't exist
      `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN NOT NULL DEFAULT false;`,
      `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isApprovedForShopify" BOOLEAN NOT NULL DEFAULT false;`,
      `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "adminNotes" TEXT;`,
      
      // Add Shopify integration columns if they don't exist
      `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "shopifyProductId" TEXT;`,
      `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "lastSyncedAt" TIMESTAMP(3);`,
      
      // Add sku column if it doesn't exist
      `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sku" TEXT;`
    ];
    
    for (const migration of migrations) {
      try {
        await prisma.$executeRawUnsafe(migration);
        console.log('✅ Migration executed:', migration.substring(0, 50) + '...');
      } catch (error) {
        // Ignore errors for columns that already exist
        if (!error.message.includes('already exists')) {
          console.warn('⚠️  Migration warning:', error.message);
        }
      }
    }
    
    // Create ShopifyConnection table if it doesn't exist
    console.log('📋 Creating ShopifyConnection table if needed...');
    
    const createShopifyTable = `
      CREATE TABLE IF NOT EXISTS "ShopifyConnection" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "adminId" TEXT NOT NULL,
        "shopifyStoreUrl" TEXT NOT NULL,
        "accessToken" TEXT NOT NULL,
        "storeName" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "lastSyncAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ShopifyConnection_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE,
        CONSTRAINT "ShopifyConnection_adminId_key" UNIQUE ("adminId")
      );
    `;
    
    try {
      await prisma.$executeRawUnsafe(createShopifyTable);
      console.log('✅ ShopifyConnection table created');
    } catch (error) {
      if (!error.message.includes('already exists')) {
        console.warn('⚠️  ShopifyConnection table warning:', error.message);
      }
    }
    
    // Verify the migration worked
    console.log('🔍 Verifying migration...');
    const testProduct = await prisma.product.findFirst({
      select: {
        id: true,
        name: true,
        sizes: true,
        colors: true,
        isVerified: true,
        isApprovedForShopify: true
      }
    });
    
    console.log('✅ Migration successful! Schema updated.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  migrateProductionDB()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateProductionDB }; 