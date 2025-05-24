const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../../utils/auth');

const prisma = new PrismaClient();

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate user
  const authResult = authenticateToken(req);
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  try {
    const { displayName, businessName, businessAddress, phoneNumber } = req.body;

    // Validate required fields
    if (!displayName) {
      return res.status(400).json({ error: 'Display name is required' });
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: authResult.user.userId },
      data: {
        displayName,
        businessName: businessName || null,
        businessAddress: businessAddress || null,
        phoneNumber: phoneNumber || null
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        businessName: true,
        businessAddress: true,
        phoneNumber: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
} 