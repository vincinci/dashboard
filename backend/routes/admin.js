const express = require('express');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Middleware to verify admin access
const requireAdmin = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { isAdmin: true }
    });

    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    next();
  } catch (error) {
    console.error('Admin verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/admin/users - Get all users with their products (Admin only)
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        businessName: true,
        businessAddress: true,
        phoneNumber: true,
        nationalIdDocument: true,
        businessRegistrationDocument: true,
        legalDeclaration: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
        products: {
          select: {
            id: true,
            name: true,
            category: true,
            description: true,
            price: true,
            quantity: true,
            delivery: true,
            pickup: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate total products per user
    const usersWithStats = users.map(user => ({
      ...user,
      totalProducts: user.products.length,
      hasNationalId: !!user.nationalIdDocument,
      hasBusinessRegistration: !!user.businessRegistrationDocument
    }));

    res.json({
      users: usersWithStats,
      total: users.length,
      totalProducts: users.reduce((sum, user) => sum + user.products.length, 0)
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/products - Get all products with vendor info (Admin only)
router.get('/products', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        vendor: {
          select: {
            id: true,
            email: true,
            displayName: true,
            businessName: true,
            phoneNumber: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      products,
      total: products.length,
      totalValue: products.reduce((sum, product) => sum + (product.price * product.quantity), 0)
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/export - Export all data as CSV (Admin only)
router.get('/export', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        vendor: {
          select: {
            id: true,
            email: true,
            displayName: true,
            businessName: true,
            businessAddress: true,
            phoneNumber: true,
            nationalIdDocument: true,
            businessRegistrationDocument: true,
            legalDeclaration: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Create CSV headers
    const headers = [
      'Product ID',
      'Product Name',
      'Category',
      'Description',
      'Price (RWF)',
      'Quantity',
      'Delivery Available',
      'Pickup Location',
      'Product Created Date',
      'Vendor ID',
      'Vendor Email',
      'Vendor Display Name',
      'Business Name',
      'Business Address',
      'Phone Number',
      'Has National ID',
      'Has Business Registration',
      'Legal Declaration Accepted',
      'Vendor Registration Date'
    ];

    // Helper function to escape CSV fields
    const escapeCSV = (field) => {
      if (field === null || field === undefined) return '';
      const str = String(field);
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Convert products to CSV rows
    const csvRows = products.map(product => [
      escapeCSV(product.id),
      escapeCSV(product.name),
      escapeCSV(product.category),
      escapeCSV(product.description),
      escapeCSV(product.price),
      escapeCSV(product.quantity),
      escapeCSV(product.delivery ? 'Yes' : 'No'),
      escapeCSV(product.pickup || ''),
      escapeCSV(product.createdAt.toISOString()),
      escapeCSV(product.vendor.id),
      escapeCSV(product.vendor.email),
      escapeCSV(product.vendor.displayName),
      escapeCSV(product.vendor.businessName || ''),
      escapeCSV(product.vendor.businessAddress || ''),
      escapeCSV(product.vendor.phoneNumber || ''),
      escapeCSV(product.vendor.nationalIdDocument ? 'Yes' : 'No'),
      escapeCSV(product.vendor.businessRegistrationDocument ? 'Yes' : 'No'),
      escapeCSV(product.vendor.legalDeclaration ? 'Yes' : 'No'),
      escapeCSV(product.vendor.createdAt.toISOString())
    ]);

    // Combine headers and rows
    const csvContent = [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');

    // Set response headers for file download
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `iwanyu_complete_export_${timestamp}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/make-admin - Make a user admin (Admin only)
router.post('/make-admin', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isAdmin: true },
      select: {
        id: true,
        email: true,
        displayName: true,
        isAdmin: true
      }
    });

    res.json({
      message: 'User promoted to admin successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Make admin error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/stats - Get dashboard statistics (Admin only)
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [totalUsers, totalProducts, totalAdmins] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.user.count({ where: { isAdmin: true } })
    ]);

    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        displayName: true,
        businessName: true,
        createdAt: true
      }
    });

    const recentProducts = await prisma.product.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        vendor: {
          select: {
            displayName: true,
            businessName: true
          }
        }
      }
    });

    res.json({
      stats: {
        totalUsers,
        totalProducts,
        totalAdmins,
        recentUsers,
        recentProducts
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 