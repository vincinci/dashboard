const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function quickAdminFix() {
  try {
    console.log('🔄 Updating admin@iwanyu.com to have admin privileges...');
    
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
    
    console.log('🎉 Admin fix complete!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Admin fix failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

quickAdminFix(); 