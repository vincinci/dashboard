const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function makeAdmin() {
  try {
    console.log('🔄 Making admin@iwanyu.com an admin user...');
    
    const updatedUser = await prisma.user.update({
      where: { email: 'admin@iwanyu.com' },
      data: { 
        isAdmin: true,
        documentsVerified: true 
      }
    });
    
    console.log('✅ Admin user updated successfully:', {
      email: updatedUser.email,
      isAdmin: updatedUser.isAdmin,
      documentsVerified: updatedUser.documentsVerified
    });
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Failed to make admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

makeAdmin(); 