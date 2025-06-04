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
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/admin/stats - Get dashboard statistics
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalProducts = await prisma.product.count();
    const activeUsers = await prisma.user.count({
      where: { isAdmin: false }
    });

    const stats = {
      totalUsers,
      totalProducts,
      activeUsers
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/users - Get all users (simplified)
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        businessName: true,
        isAdmin: true,
        _count: {
          select: { products: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const usersWithStats = users.map(user => ({
      ...user,
      totalProducts: user._count.products
    }));

    res.json({ users: usersWithStats });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/products - Get all products (simplified)
router.get('/products', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        price: true,
        quantity: true,
        vendor: {
          select: {
            id: true,
            email: true,
            displayName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ products });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/export - Simple CSV export
router.get('/export', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        description: true,
        price: true,
        quantity: true,
        delivery: true,
        createdAt: true,
        vendor: {
          select: {
            email: true,
            displayName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const headers = ['ID', 'Name', 'Category', 'Description', 'Price', 'Quantity', 'Delivery', 'Vendor Email', 'Vendor Name', 'Created'];
    
    const csvRows = products.map(product => [
      product.id,
      product.name || '',
      product.category || '',
      (product.description || '').replace(/"/g, '""'),
      product.price || 0,
      product.quantity || 0,
      product.delivery ? 'Yes' : 'No',
      product.vendor.email,
      product.vendor.displayName || '',
      product.createdAt.toISOString().split('T')[0]
    ].map(field => 
      typeof field === 'string' && field.includes(',') ? `"${field}"` : field
    ).join(','));

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="export.csv"');
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/export-shopify - Shopify-compatible export using template format
router.get('/export-shopify', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        vendor: {
          select: {
            displayName: true,
            businessName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Shopify CSV headers based on the template
    const headers = [
      'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Product Category', 'Type', 'Tags',
      'Published', 'Option1 Name', 'Option1 Value', 'Option2 Name', 'Option2 Value',
      'Option3 Name', 'Option3 Value', 'Variant SKU', 'Variant Grams', 'Variant Inventory Tracker',
      'Variant Inventory Qty', 'Variant Inventory Policy', 'Variant Fulfillment Service',
      'Variant Price', 'Variant Compare At Price', 'Variant Requires Shipping', 'Variant Taxable',
      'Variant Barcode', 'Image Src', 'Image Position', 'Image Alt Text', 'Gift Card',
      'SEO Title', 'SEO Description', 'Google Shopping / Google Product Category',
      'Google Shopping / Gender', 'Google Shopping / Age Group', 'Google Shopping / MPN',
      'Google Shopping / Condition', 'Google Shopping / Custom Product', 'Variant Image',
      'Variant Weight Unit', 'Variant Tax Code', 'Cost per item', 'Included / United States',
      'Price / United States', 'Compare At Price / United States', 'Included / International',
      'Price / International', 'Compare At Price / International', 'Status'
    ];

    const csvRows = products.map(product => {
      const handle = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const vendor = product.vendor.businessName || product.vendor.displayName || 'Unknown';
      const images = product.images ? JSON.parse(product.images) : [];
      const firstImage = images.length > 0 ? images[0] : '';
      
      return [
        handle,                           // Handle
        product.name,                     // Title
        `<p>${product.description}</p>`,  // Body (HTML)
        vendor,                           // Vendor
        product.category,                 // Product Category
        product.category,                 // Type
        'Dashboard Import',               // Tags
        'TRUE',                          // Published
        'Title',                         // Option1 Name
        'Default Title',                 // Option1 Value
        '',                              // Option2 Name
        '',                              // Option2 Value
        '',                              // Option3 Name
        '',                              // Option3 Value
        product.id.substring(0, 8),      // Variant SKU
        '0',                             // Variant Grams
        'shopify',                       // Variant Inventory Tracker
        product.quantity,                // Variant Inventory Qty
        'deny',                          // Variant Inventory Policy
        'manual',                        // Variant Fulfillment Service
        product.price,                   // Variant Price
        '',                              // Variant Compare At Price
        product.delivery ? 'TRUE' : 'FALSE', // Variant Requires Shipping
        'TRUE',                          // Variant Taxable
        '',                              // Variant Barcode
        firstImage,                      // Image Src
        firstImage ? '1' : '',           // Image Position
        product.name,                    // Image Alt Text
        'FALSE',                         // Gift Card
        product.name,                    // SEO Title
        product.description,             // SEO Description
        '',                              // Google Shopping / Google Product Category
        '',                              // Google Shopping / Gender
        '',                              // Google Shopping / Age Group
        '',                              // Google Shopping / MPN
        'new',                           // Google Shopping / Condition
        'TRUE',                          // Google Shopping / Custom Product
        firstImage,                      // Variant Image
        'g',                             // Variant Weight Unit
        '',                              // Variant Tax Code
        '',                              // Cost per item
        'TRUE',                          // Included / United States
        '',                              // Price / United States
        '',                              // Compare At Price / United States
        'TRUE',                          // Included / International
        '',                              // Price / International
        '',                              // Compare At Price / International
        'active'                         // Status
      ].map(field => 
        typeof field === 'string' && (field.includes(',') || field.includes('"')) 
          ? `"${field.replace(/"/g, '""')}"` 
          : field
      ).join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="shopify-export.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error('Error in Shopify export:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/users/:userId - Delete a user
router.delete('/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isAdmin: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isAdmin) {
      return res.status(403).json({ error: 'Cannot delete admin users' });
    }

    await prisma.user.delete({ where: { id: userId } });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// DELETE /api/admin/products/:productId - Delete a product
router.delete('/products/:productId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { productId } = req.params;
    
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await prisma.product.delete({ where: { id: productId } });
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router; 