const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const adminEmail = 'admin@iwanyu.com';
    const adminPassword = 'admin123'; // Change this to a secure password
    
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (existingAdmin) {
      console.log('Admin user already exists!');
      
      // Update to make sure they're admin
      await prisma.user.update({
        where: { email: adminEmail },
        data: { isAdmin: true }
      });
      
      console.log('✅ Admin status confirmed');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        displayName: 'Admin User',
        businessName: 'Iwanyu Store',
        isAdmin: true,
        legalDeclaration: true,
        documentsVerified: true
      }
    });

    console.log('✅ Admin user created successfully!');
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`🔑 Password: ${adminPassword}`);
    console.log('🚨 Please change the password after first login!');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin(); 