const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function initProductionDB() {
  try {
    console.log('🔄 Initializing production database...');

    // Check if admin user already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@iwanyu.com' }
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      return;
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

    console.log('✅ Admin user created successfully:', {
      id: adminUser.id,
      email: adminUser.email,
      displayName: adminUser.displayName
    });

    // Create a test vendor user
    const vendorPassword = await bcrypt.hash('vendor123', 10);
    
    const vendorUser = await prisma.user.create({
      data: {
        email: 'vendor@test.com',
        password: vendorPassword,
        displayName: 'Test Vendor',
        businessName: 'Test Business',
        businessAddress: 'KN 15 Ave, Kimisagara, Nyarugenge District, Kigali, Rwanda',
        phoneNumber: '+250 788 123 456',
        nationalIdDocument: 'test-national-id',
        businessRegistrationDocument: 'test-business-reg',
        legalDeclaration: true,
        isAdmin: false,
        documentsVerified: true
      }
    });

    console.log('✅ Test vendor created successfully:', {
      id: vendorUser.id,
      email: vendorUser.email,
      displayName: vendorUser.displayName
    });

    console.log('🎉 Production database initialized successfully!');

  } catch (error) {
    console.error('❌ Error initializing production database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  initProductionDB()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { initProductionDB }; 