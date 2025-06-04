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

    // Parse images from comma-separated strings to arrays
    const productsWithParsedImages = products.map(product => ({
      ...product,
      images: product.images && product.images.trim() ? product.images.split(',').map(img => img.trim()) : []
    }));

    // Include simple pagination data for frontend compatibility
    const response = {
      products: productsWithParsedImages,
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
    const { name, category, description, price, quantity, images, delivery, pickup } = req.body;

    // Validate required fields
    if (!name || !category || !description || price === undefined || quantity === undefined || delivery === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check product limit
    const existingProductsCount = await prisma.product.count({
      where: { vendorId }
    });

    if (existingProductsCount >= PRODUCT_LIMIT) {
      return res.status(403).json({ error: 'Product limit reached. Maximum 10 products allowed per vendor.' });
    }

    // Validate and sanitize images array - use comma-separated string instead of JSON
    let processedImages = null;
    
    if (images !== undefined && images !== null) {
      if (Array.isArray(images)) {
        // Process array of image URLs
        const validImages = images
          .filter(img => img && typeof img === 'string' && img.trim().length > 0)
          .map(img => img.trim())
          .slice(0, 10); // Limit to 10 images max
        
        processedImages = validImages.length > 0 ? validImages.join(',') : null;
      } else if (typeof images === 'string' && images.trim().length > 0) {
        // Handle single image URL passed as string
        processedImages = images.trim();
      }
      // If images is empty array, empty string, or invalid type, keep processedImages as null
    }

    console.log('Creating product with processed images:', processedImages);
    console.log('All product data:', {
      vendorId,
      name,
      category,
      description,
      price: parseFloat(price),
      quantity: parseInt(quantity),
      // images: processedImages,  // Temporarily disabled
      delivery,
      pickup: pickup || null
    });

    // Create product
    const product = await prisma.product.create({
      data: {
        vendorId,
        name,
        category,
        description,
        price: parseFloat(price),
        quantity: parseInt(quantity),
        // images: processedImages,  // Temporarily disabled
        delivery,
        pickup: pickup || null
      }
    });

    // Parse comma-separated string back to array for response
    const responseProduct = {
      ...product,
      images: product.images ? product.images.split(',') : []
    };

    res.status(201).json(responseProduct);
  } catch (error) {
    console.error('Error creating product:', error);
    console.error('Request body:', req.body);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT /api/products/:id → Edit product (only owner can edit)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.userId;
    const { name, category, description, price, quantity, images, delivery, pickup } = req.body;

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

    // Validate and sanitize images array if provided
    let processedImages = undefined;
    if (images !== undefined) {
      if (images && Array.isArray(images) && images.length > 0) {
        // Ensure images is a simple array of strings (URLs)
        const validImages = images
          .filter(img => typeof img === 'string' && img.trim().length > 0)
          .slice(0, 10); // Limit to 10 images max
        
        processedImages = validImages.length > 0 ? validImages.join(',') : null;
      } else {
        processedImages = null;
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
        pickup: pickup !== undefined ? pickup : existingProduct.pickup
      }
    });

    // Parse comma-separated string back to array for response
    const responseProduct = {
      ...updatedProduct,
      images: updatedProduct.images ? updatedProduct.images.split(',') : []
    };

    res.json(responseProduct);
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