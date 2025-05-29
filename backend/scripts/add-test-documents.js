const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addTestDocuments() {
  try {
    // Find the test vendor user
    const testUser = await prisma.user.findFirst({
      where: { 
        email: 'vendor@test.com' 
      }
    });

    if (!testUser) {
      console.log('Test user not found. Please run the seed script first.');
      return;
    }

    // Create a simple test image as base64 (a 1x1 red pixel)
    const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    
    // Update the user with test document data
    const updatedUser = await prisma.user.update({
      where: { id: testUser.id },
      data: {
        nationalIdDocument: testImageBase64,
        businessRegistrationDocument: testImageBase64
      }
    });

    console.log(`✅ Added test documents to user: ${updatedUser.displayName} (${updatedUser.email})`);
    console.log('🔸 National ID Document: Added');
    console.log('🔸 Business Registration Document: Added');
    console.log('\nYou can now test the document viewing feature in the admin panel!');

  } catch (error) {
    console.error('❌ Error adding test documents:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTestDocuments(); 