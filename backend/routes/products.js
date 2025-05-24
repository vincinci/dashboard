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
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

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

    res.json(products);
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

    // Create product
    const product = await prisma.product.create({
      data: {
        vendorId,
        name,
        category,
        description,
        price: parseFloat(price),
        quantity: parseInt(quantity),
        images: images || [],
        delivery,
        pickup: pickup || null
      }
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
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

    // Update product
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name: name || existingProduct.name,
        category: category || existingProduct.category,
        description: description || existingProduct.description,
        price: price !== undefined ? parseFloat(price) : existingProduct.price,
        quantity: quantity !== undefined ? parseInt(quantity) : existingProduct.quantity,
        images: images !== undefined ? images : existingProduct.images,
        delivery: delivery !== undefined ? delivery : existingProduct.delivery,
        pickup: pickup !== undefined ? pickup : existingProduct.pickup
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

module.exports = router; 