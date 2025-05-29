const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function simpleInit() {
  try {
    console.log('🔄 Starting simple database initialization...');
    
    // Test connection first
    console.log('📡 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Check if we can query users table
    try {
      const userCount = await prisma.user.count();
      console.log(`✅ Users table exists. Current count: ${userCount}`);
      
      // Check if admin exists
      const adminExists = await prisma.user.findUnique({
        where: { email: 'admin@iwanyu.com' }
      });
      
      if (adminExists) {
        console.log('✅ Admin user already exists');
        process.exit(0);
      }
      
    } catch (tableError) {
      console.log('⚠️ Users table might not exist, but connection is working');
      console.log('This is normal for a fresh database - Prisma will handle schema creation');
    }
    
    // Create admin user
    console.log('👤 Creating admin user...');
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
    
    console.log('✅ Admin user created:', {
      id: adminUser.id,
      email: adminUser.email,
      displayName: adminUser.displayName
    });
    
    console.log('🎉 Database initialization completed successfully!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', {
      message: error.message,
      code: error.code,
      name: error.name
    });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

simpleInit(); 