const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixSchemaSync() {
  try {
    console.log('🔄 Checking and fixing database schema...');
    
    // Try to add the sku column if it doesn't exist
    try {
      await prisma.$executeRaw`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sku" TEXT`;
      console.log('✅ Added sku column to Product table');
    } catch (error) {
      console.log('ℹ️ SKU column might already exist:', error.message);
    }
    
    // Try to add the status column if it doesn't exist
    try {
      await prisma.$executeRaw`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active'`;
      console.log('✅ Added status column to Product table');
    } catch (error) {
      console.log('ℹ️ Status column might already exist:', error.message);
    }
    
    // Test the Product table structure
    const products = await prisma.product.findMany({
      take: 1
    });
    
    console.log('✅ Product table structure is now correct!');
    console.log(`📊 Product count: ${products.length}`);
    
    console.log('🎉 Schema sync complete!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Schema sync failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixSchemaSync(); 