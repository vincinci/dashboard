const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

// Authentication middleware
const authenticateToken = (req) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return { error: 'Access token required', status: 401 };
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    return { user };
  } catch (error) {
    return { error: 'Invalid or expired token', status: 403 };
  }
};

// Admin middleware
const requireAdmin = (user) => {
  if (!user.isAdmin) {
    return { error: 'Admin access required', status: 403 };
  }
  return { success: true };
};

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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate user
  const authResult = authenticateToken(req);
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  // Check admin access
  const adminCheck = requireAdmin(authResult.user);
  if (adminCheck.error) {
    return res.status(adminCheck.status).json({ error: adminCheck.error });
  }

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
  } finally {
    await prisma.$disconnect();
  }
} 