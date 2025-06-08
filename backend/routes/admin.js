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
            businessName: true,
            email: true,
            businessAddress: true
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

    // Helper function to validate and fix image URLs
    const validateImageUrl = (url) => {
      if (!url || typeof url !== 'string') {
        return `https://via.placeholder.com/400x300/f59e0b/ffffff?text=${encodeURIComponent('No Image')}`;
      }
      
      // Check if it's a valid URL format
      try {
        // If it's a base64 data URL, Shopify doesn't support it in CSV imports
        // Convert to placeholder since Shopify needs fetchable URLs
        if (url.startsWith('data:image/')) {
          return `https://via.placeholder.com/400x300/f59e0b/ffffff?text=${encodeURIComponent('Product Image')}`;
        }
        
        // If it's a relative path, make it absolute (you'll need to replace with your actual domain)
        if (url.startsWith('/')) {
          return `https://your-domain.com${url}`;
        }
        
        // Check if it's already a valid HTTP/HTTPS URL
        if (url.startsWith('http://') || url.startsWith('https://')) {
          return url.trim();
        }
        
        // If it's just a filename or invalid format, create a placeholder
        if (!url.includes('://')) {
          return `https://via.placeholder.com/400x300/f59e0b/ffffff?text=${encodeURIComponent('Product Image')}`;
        }
        
        return url.trim();
      } catch (e) {
        console.warn('Invalid image URL:', url);
        return `https://via.placeholder.com/400x300/f59e0b/ffffff?text=${encodeURIComponent('Product Image')}`;
      }
    };

    // Helper function to create enhanced vendor information
    const createVendorInfo = (vendor) => {
      const vendorName = vendor.businessName || vendor.displayName || 'Unknown Vendor';
      const vendorEmail = vendor.email || '';
      const vendorAddress = vendor.businessAddress || '';
      
      return {
        name: vendorName,
        tags: [
          'Dashboard Import',
          vendorEmail ? `Vendor: ${vendorEmail}` : '',
          vendorAddress ? `Location: ${vendorAddress.split(',')[0]}` : ''
        ].filter(Boolean).join(', ')
      };
    };

    const csvRows = [];

    products.forEach((product, productIndex) => {
      const handle = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const vendorInfo = createVendorInfo(product.vendor);
      
      // Process and validate images
      const images = (product.images || [])
        .map(img => validateImageUrl(img))
        .filter(img => img && img.length > 0 && img.startsWith('http'))
        .slice(0, 10); // Shopify supports up to 250 images, but we'll limit to 10 for performance
      
      // Escape HTML in description and create formatted description
      const htmlDescription = `<p>${product.description.replace(/"/g, '&quot;').replace(/\n/g, '</p><p>')}</p>`;
      
      // Parse sizes and colors
      let sizes = [];
      let colors = [];
      
      try {
        if (product.sizes) {
          sizes = JSON.parse(product.sizes);
        }
      } catch (e) {
        console.warn('Failed to parse sizes for product:', product.id);
      }
      
      try {
        if (product.colors) {
          colors = JSON.parse(product.colors);
        }
      } catch (e) {
        console.warn('Failed to parse colors for product:', product.id);
      }

      // Function to create a CSV row
      const createRow = (isFirstVariant, isFirstImage, variantSku, option1Name, option1Value, option2Name, option2Value, imageUrl, imagePosition, variantQuantity) => {
        return [
          handle,                           // Handle
          isFirstVariant ? product.name : '',  // Title (only on first variant)
          isFirstVariant ? htmlDescription : '',  // Body (HTML)
          isFirstVariant ? vendorInfo.name : '',   // Vendor
          isFirstVariant ? product.category : '',  // Product Category
          isFirstVariant ? product.category : '',  // Type
          isFirstVariant ? vendorInfo.tags : '',   // Tags (enhanced with vendor info)
          isFirstVariant ? 'TRUE' : '',        // Published
          option1Name,                      // Option1 Name
          option1Value,                     // Option1 Value
          option2Name,                      // Option2 Name
          option2Value,                     // Option2 Value
          '',                              // Option3 Name
          '',                              // Option3 Value
          variantSku,                      // Variant SKU
          '0',                             // Variant Grams
          'shopify',                       // Variant Inventory Tracker
          variantQuantity,                 // Variant Inventory Qty
          'deny',                          // Variant Inventory Policy
          'manual',                        // Variant Fulfillment Service
          product.price,                   // Variant Price
          '',                              // Variant Compare At Price
          product.delivery ? 'TRUE' : 'FALSE', // Variant Requires Shipping
          'TRUE',                          // Variant Taxable
          '',                              // Variant Barcode
          imageUrl,                        // Image Src
          imagePosition,                   // Image Position
          isFirstImage ? `${product.name} - Image ${imagePosition}` : '', // Image Alt Text
          'FALSE',                         // Gift Card
          isFirstVariant ? product.name : '', // SEO Title
          isFirstVariant ? product.description : '', // SEO Description
          '',                              // Google Shopping / Google Product Category
          '',                              // Google Shopping / Gender
          '',                              // Google Shopping / Age Group
          '',                              // Google Shopping / MPN
          'new',                           // Google Shopping / Condition
          'TRUE',                          // Google Shopping / Custom Product
          imageUrl,                        // Variant Image
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
          typeof field === 'string' && (field.includes(',') || field.includes('"') || field.includes('\n')) 
            ? `"${field.replace(/"/g, '""')}"` 
            : field
        ).join(',');
      };

      // If no variants, create rows for each image
      if (sizes.length === 0 && colors.length === 0) {
        if (images.length === 0) {
          // No images, create single row with placeholder
          const placeholderImage = `https://via.placeholder.com/400x300/f59e0b/ffffff?text=${encodeURIComponent(product.name)}`;
          csvRows.push(createRow(
            true, // isFirstVariant
            true, // isFirstImage
            product.id.substring(0, 8), // variantSku
            'Title', // option1Name
            'Default Title', // option1Value
            '', // option2Name
            '', // option2Value
            placeholderImage, // imageUrl
            '1', // imagePosition
            product.quantity // variantQuantity
          ));
        } else {
          // Create a row for each image
          images.forEach((imageUrl, imageIndex) => {
            const isFirstImage = imageIndex === 0;
            csvRows.push(createRow(
              isFirstImage, // isFirstVariant (only first image gets product details)
              true, // isFirstImage
              isFirstImage ? product.id.substring(0, 8) : '', // variantSku (only on first)
              isFirstImage ? 'Title' : '', // option1Name
              isFirstImage ? 'Default Title' : '', // option1Value
              '', // option2Name
              '', // option2Value
              imageUrl, // imageUrl
              (imageIndex + 1).toString(), // imagePosition
              isFirstImage ? product.quantity : '' // variantQuantity (only on first)
            ));
          });
        }
      } else {
        // Create variants for size/color combinations with images
        const sizeOptions = sizes.length > 0 ? sizes : [''];
        const colorOptions = colors.length > 0 ? colors : [''];
        
        let variantIndex = 0;
        let isFirstVariantOverall = true;
        
        sizeOptions.forEach(size => {
          colorOptions.forEach(color => {
            const option1Name = sizes.length > 0 ? 'Size' : (colors.length > 0 ? 'Color' : 'Title');
            const option1Value = sizes.length > 0 ? size : (colors.length > 0 ? color : 'Default Title');
            const option2Name = sizes.length > 0 && colors.length > 0 ? 'Color' : '';
            const option2Value = sizes.length > 0 && colors.length > 0 ? color : '';
            
            const variantSku = `${product.id.substring(0, 8)}-${variantIndex}`;
            const variantQuantity = Math.floor(product.quantity / (sizeOptions.length * colorOptions.length));
            
            if (images.length === 0) {
              // No images, create single row for this variant
              const placeholderImage = `https://via.placeholder.com/400x300/f59e0b/ffffff?text=${encodeURIComponent(product.name)}`;
              csvRows.push(createRow(
                isFirstVariantOverall, // isFirstVariant
                true, // isFirstImage
                variantSku, // variantSku
                option1Name, // option1Name
                option1Value, // option1Value
                option2Name, // option2Name
                option2Value, // option2Value
                placeholderImage, // imageUrl
                isFirstVariantOverall ? '1' : '', // imagePosition
                variantQuantity // variantQuantity
              ));
              isFirstVariantOverall = false;
            } else {
              // Create rows for this variant with each image
              images.forEach((imageUrl, imageIndex) => {
                const isFirstImageOfVariant = imageIndex === 0;
                const isFirstImageOverall = isFirstVariantOverall && isFirstImageOfVariant;
                
                csvRows.push(createRow(
                  isFirstImageOverall, // isFirstVariant (only very first gets product details)
                  isFirstImageOfVariant, // isFirstImage
                  isFirstImageOfVariant ? variantSku : '', // variantSku (only on first image of variant)
                  isFirstImageOfVariant ? option1Name : '', // option1Name
                  isFirstImageOfVariant ? option1Value : '', // option1Value
                  isFirstImageOfVariant ? option2Name : '', // option2Name
                  isFirstImageOfVariant ? option2Value : '', // option2Value
                  imageUrl, // imageUrl
                  (imageIndex + 1).toString(), // imagePosition
                  isFirstImageOfVariant ? variantQuantity : '' // variantQuantity
                ));
              });
              isFirstVariantOverall = false;
            }
            
            variantIndex++;
          });
        });
      }
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    
    const timestamp = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="shopify-export_${timestamp}.csv"`);
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