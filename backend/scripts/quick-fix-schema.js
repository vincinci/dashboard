const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function quickFixSchema() {
  try {
    console.log('🔄 Adding missing documentsVerified column...');
    
    // Add the missing column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS "documentsVerified" BOOLEAN NOT NULL DEFAULT false;
    `);
    
    console.log('✅ Column added successfully');
    
    // Test if we can now query users
    const userCount = await prisma.user.count();
    console.log(`✅ User count test successful: ${userCount} users`);
    
    console.log('🎉 Schema fix complete!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Schema fix failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

quickFixSchema(); 