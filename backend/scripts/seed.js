const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function seed() {
  try {
    console.log('🌱 Starting fresh seed...');

    // Clear existing data
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
    console.log('✅ Cleared existing data');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    
    const admin = await prisma.user.create({
      data: {
        email: 'admin@iwanyu.com',
        password: adminPassword,
        displayName: 'Admin User',
        businessName: 'Iwanyu Store',
        businessAddress: 'Kigali, Rwanda',
        phoneNumber: '+250788123456',
        nationalIdDocument: 'dummy-base64-data',
        businessRegistrationDocument: 'dummy-base64-data',
        legalDeclaration: true,
        isAdmin: true,
        documentsVerified: true
      }
    });

    console.log('✅ Created admin user:', admin.email);
    console.log('📧 Admin login: admin@iwanyu.com');
    console.log('🔑 Admin password: admin123');
    
    console.log('🎉 Seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed(); 