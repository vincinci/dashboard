const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

async function migrate() {
  try {
    console.log('🔄 Starting database migration process...');

    // Run prisma generate
    console.log('📦 Generating Prisma Client...');
    execSync('npx prisma generate', { stdio: 'inherit' });

    // Create a Prisma client instance
    const prisma = new PrismaClient();

    // Test database connection
    console.log('🔌 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Run migrations
    console.log('🚀 Running database migrations...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('✅ Database migrations completed successfully');

    // Close Prisma client
    await prisma.$disconnect();
    
    console.log('✨ Migration process completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Execute the migration
migrate(); 