const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const router = express.Router();
const prisma = new PrismaClient();

const PRODUCT_LIMIT = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
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
}

// GET /api/products → Get authenticated user's products
router.get('/', authenticateToken, async (req, res) => {
  try {
    const vendorId = req.user.userId;

    const products = await prisma.product.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' }
    });

    // Images are now stored as String[] so they're already arrays
    const response = {
      products: products,
      pagination: {
        total: products.length,
        pages: 1,
        currentPage: 1,
        limit: products.length
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// POST /api/products → Add product (check limit)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const vendorId = req.user.userId;
    const { name, category, description, price, quantity, images, delivery, pickup, sizes, colors } = req.body;

    console.log('=== PRODUCT CREATION DEBUG ===');
    console.log('Request body:', req.body);
    console.log('Vendor ID:', vendorId);

    // Validate required fields
    if (!name || !category || !description || price === undefined || quantity === undefined || delivery === undefined) {
      console.log('Missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check product limit
    const existingProductsCount = await prisma.product.count({
      where: { vendorId }
    });

    if (existingProductsCount >= PRODUCT_LIMIT) {
      return res.status(403).json({ error: 'Product limit reached. Maximum 10 products allowed per vendor.' });
    }

    // Process images - handle as array
    let processedImages = [];
    if (images && Array.isArray(images)) {
      processedImages = images
        .filter(img => typeof img === 'string' && img.trim().length > 0)
        .slice(0, 10); // Limit to 10 images max
    }

    console.log('Processed images array:', processedImages);

    // Create product data object
    const productData = {
      vendorId,
      name,
      category,
      description,
      price: parseFloat(price),
      quantity: parseInt(quantity),
      delivery,
      pickup: pickup || null,
      images: processedImages,  // Store as array directly
      sizes: sizes || null,     // Store as JSON string
      colors: colors || null    // Store as JSON string
    };

    console.log('Final product data:', productData);

    // Create product
    const product = await prisma.product.create({
      data: productData
    });

    console.log('Product created successfully:', product.id);

    res.status(201).json(product);
  } catch (error) {
    console.error('=== PRODUCT CREATION ERROR ===');
    console.error('Full error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    if (error.code) console.error('Error code:', error.code);
    if (error.meta) console.error('Error meta:', error.meta);
    if (error.stack) console.error('Error stack:', error.stack);
    
    res.status(500).json({ 
      error: 'Failed to create product', 
      details: error.message,
      code: error.code || 'UNKNOWN'
    });
  }
});

// PUT /api/products/:id → Edit product (only owner can edit)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.userId;
    const { name, category, description, price, quantity, images, delivery, pickup, sizes, colors } = req.body;

    // Check if product exists and belongs to the user
    const existingProduct = await prisma.product.findFirst({
      where: { 
        id,
        vendorId 
      }
    });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found or access denied' });
    }

    // Process images - handle as array
    let processedImages = undefined;
    if (images !== undefined) {
      if (images && Array.isArray(images)) {
        processedImages = images
          .filter(img => typeof img === 'string' && img.trim().length > 0)
          .slice(0, 10); // Limit to 10 images max
      } else {
        processedImages = [];
      }
    }

    // Update product
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name: name || existingProduct.name,
        category: category || existingProduct.category,
        description: description || existingProduct.description,
        price: price !== undefined ? parseFloat(price) : existingProduct.price,
        quantity: quantity !== undefined ? parseInt(quantity) : existingProduct.quantity,
        images: processedImages !== undefined ? processedImages : existingProduct.images,
        delivery: delivery !== undefined ? delivery : existingProduct.delivery,
        pickup: pickup !== undefined ? pickup : existingProduct.pickup,
        sizes: sizes !== undefined ? sizes : existingProduct.sizes,
        colors: colors !== undefined ? colors : existingProduct.colors
      }
    });

    res.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /api/products/:id → Delete product (only owner can delete)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.userId;

    // Check if product exists and belongs to the user
    const existingProduct = await prisma.product.findFirst({
      where: { 
        id,
        vendorId 
      }
    });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found or access denied' });
    }

    // Delete product
    await prisma.product.delete({
      where: { id }
    });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// DEBUG endpoint to test image processing
router.post('/debug-images', authenticateToken, async (req, res) => {
  try {
    const { images } = req.body;
    
    console.log('Debug - Raw images:', images);
    console.log('Debug - Images type:', typeof images);
    console.log('Debug - Is array:', Array.isArray(images));
    
    let processedImages = null;
    if (images && Array.isArray(images) && images.length > 0) {
      const validImages = images
        .filter(img => typeof img === 'string' && img.trim().length > 0)
        .slice(0, 10);
      
      if (validImages.length > 0) {
        processedImages = validImages.join(',');
      }
    }
    
    console.log('Debug - Processed images:', processedImages);
    
    res.json({
      raw: images,
      processed: processedImages,
      type: typeof images,
      isArray: Array.isArray(images)
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 