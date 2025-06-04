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

// GET /api/admin/users/:userId/documents - Get user documents for viewing (Admin only)
router.get('/users/:userId/documents', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        displayName: true,
        email: true,
        businessName: true,
        nationalIdDocument: true,
        businessRegistrationDocument: true,
        documentsVerified: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return document info with base64 data for display
    const documents = {
      nationalId: {
        exists: !!user.nationalIdDocument,
        data: user.nationalIdDocument || null
      },
      businessRegistration: {
        exists: !!user.businessRegistrationDocument,
        data: user.businessRegistrationDocument || null
      }
    };

    res.json({ 
      user: {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        businessName: user.businessName,
        documentsVerified: user.documentsVerified,
        createdAt: user.createdAt
      },
      documents 
    });
  } catch (error) {
    console.error('Error fetching user documents:', error);
    res.status(500).json({ error: 'Failed to fetch user documents' });
  }
});

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
        documentsVerified: true,
        createdAt: true,
        updatedAt: true,
        products: {
          select: {
            id: true,
            name: true,
            category: true,
            price: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Add computed fields for each user
    const usersWithStats = users.map(user => ({
      ...user,
      totalProducts: user.products?.length || 0,
      hasNationalId: !!user.nationalIdDocument,
      hasBusinessRegistration: !!user.businessRegistrationDocument,
      documentsVerified: user.documentsVerified || false
    }));

    res.json({ users: usersWithStats });
  } catch (error) {
    console.error('Error fetching users:', error);
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
            email: true,
            displayName: true,
            businessName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // CSV headers matching the exact product creation form fields
    const headers = [
      'ID',
      'Name',
      'Category', 
      'Description',
      'Price',
      'Quantity',
      'Delivery',
      'Pickup',
      'Images',
      'Sizes',
      'Colors',
      'Status',
      'Vendor Email',
      'Vendor Name',
      'Created Date'
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

    // Generate CSV rows
    const csvRows = products.map(product => {
      // Parse JSON fields safely
      let sizes = [];
      let colors = [];
      let images = [];
      
      try {
        sizes = product.sizes ? JSON.parse(product.sizes) : [];
        colors = product.colors ? JSON.parse(product.colors) : [];
        images = product.images ? JSON.parse(product.images) : [];
      } catch (e) {
        console.warn('Error parsing JSON for product', product.id, e);
      }
      
      return [
        escapeCSV(product.id),
        escapeCSV(product.name),
        escapeCSV(product.category),
        escapeCSV(product.description),
        escapeCSV(product.price),
        escapeCSV(product.quantity),
        escapeCSV(product.delivery ? 'Yes' : 'No'),
        escapeCSV(product.pickup || ''),
        escapeCSV(images.join('; ')),
        escapeCSV(sizes.join('; ')),
        escapeCSV(colors.join('; ')),
        escapeCSV(product.status || 'active'),
        escapeCSV(product.vendor.email),
        escapeCSV(product.vendor.displayName || product.vendor.businessName || ''),
        escapeCSV(product.createdAt.toISOString().split('T')[0]) // Just date, not full timestamp
      ].join(',');
    });

    // Combine headers and rows
    const csvContent = [headers.join(','), ...csvRows].join('\n');

    // Set response headers for file download
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `products_export_${timestamp}.csv`;
    
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

// POST /api/admin/verify-documents - Verify user documents (Admin only)
router.post('/verify-documents', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Try to update with documentsVerified field
    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { documentsVerified: true },
        select: {
          id: true,
          email: true,
          displayName: true,
          documentsVerified: true
        }
      });
      res.json({ message: 'Documents verified successfully', user: updatedUser });
    } catch (dbError) {
      // If the field doesn't exist, return a helpful message
      if (dbError.message.includes('documentsVerified')) {
        return res.status(500).json({ 
          error: 'Database schema needs to be updated. Please run migration or deploy to production.' 
        });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Verify documents error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/reject-documents - Reject user documents (Admin only)
router.post('/reject-documents', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Try to update with documentsVerified field
    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { documentsVerified: false },
        select: {
          id: true,
          email: true,
          displayName: true,
          documentsVerified: true
        }
      });
      res.json({ message: 'Documents rejected successfully', user: updatedUser });
    } catch (dbError) {
      // If the field doesn't exist, return a helpful message
      if (dbError.message.includes('documentsVerified')) {
        return res.status(500).json({ 
          error: 'Database schema needs to be updated. Please run migration or deploy to production.' 
        });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Reject documents error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/delivery-addresses → Get all users with delivery addresses
router.get('/delivery-addresses', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        businessAddress: {
          not: null
        }
      },
      select: {
        id: true,
        displayName: true,
        email: true,
        phoneNumber: true,
        businessName: true,
        businessAddress: true,
        documentsVerified: true,
        isAdmin: true,
        createdAt: true,
        products: {
          where: {
            delivery: true
          },
          select: {
            id: true,
            name: true,
            price: true,
            category: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const deliveryData = users.map(user => ({
      ...user,
      totalDeliveryProducts: user.products.length,
      hasDeliveryProducts: user.products.length > 0
    }));

    res.json({
      success: true,
      addresses: deliveryData,
      total: deliveryData.length
    });
  } catch (error) {
    console.error('Error fetching delivery addresses:', error);
    res.status(500).json({ error: 'Failed to fetch delivery addresses' });
  }
});

// DELETE /api/admin/users/:userId - Remove/delete a user (Admin only)
router.delete('/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if user exists and get their info before deletion
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        isAdmin: true,
        products: {
          select: { id: true }
        }
      }
    });

    if (!userToDelete) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deletion of admin users (safety measure)
    if (userToDelete.isAdmin) {
      return res.status(403).json({ error: 'Cannot delete admin users' });
    }

    // Delete the user (this will cascade delete their products due to onDelete: Cascade in schema)
    await prisma.user.delete({
      where: { id: userId }
    });

    res.json({ 
      message: 'User deleted successfully',
      deletedUser: {
        id: userToDelete.id,
        email: userToDelete.email,
        displayName: userToDelete.displayName,
        productsDeleted: userToDelete.products.length
      }
    });

  } catch (error) {
    console.error('Delete user error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// DELETE /api/admin/products/:productId - Delete a product (Admin only)
router.delete('/products/:productId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { productId } = req.params;
    
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    // Check if product exists and get its info before deletion
    const productToDelete = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        category: true,
        price: true,
        vendor: {
          select: {
            id: true,
            displayName: true,
            email: true
          }
        }
      }
    });

    if (!productToDelete) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Delete the product
    await prisma.product.delete({
      where: { id: productId }
    });

    console.log(`Admin deleted product: ${productToDelete.name} (ID: ${productId}) by vendor: ${productToDelete.vendor.displayName}`);

    res.json({ 
      message: 'Product deleted successfully',
      deletedProduct: {
        id: productToDelete.id,
        name: productToDelete.name,
        category: productToDelete.category,
        price: productToDelete.price,
        vendor: productToDelete.vendor
      }
    });

  } catch (error) {
    console.error('Delete product error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router; 