const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { secretKey } = req.body;
    
    // Simple security check
    if (secretKey !== 'iwanyu-admin-setup-2024') {
      return res.status(403).json({ error: 'Invalid secret key' });
    }

    const adminEmail = 'admin@iwanyu.com';
    const adminPassword = 'admin123'; // Change this to a secure password
    
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (existingAdmin) {
      // Update to make sure they're admin
      await prisma.user.update({
        where: { email: adminEmail },
        data: { isAdmin: true, documentsVerified: true }
      });
      
      return res.json({ 
        message: 'Admin user already exists and updated!',
        email: adminEmail,
        note: 'Password unchanged'
      });
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

    res.json({
      message: 'Admin user created successfully!',
      email: adminEmail,
      password: adminPassword,
      warning: 'Please change the password after first login!'
    });
    
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({ error: 'Failed to create admin user' });
  } finally {
    await prisma.$disconnect();
  }
} 