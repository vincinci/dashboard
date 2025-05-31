const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');

const router = express.Router();
const prisma = new PrismaClient();

// Initialize cache with 5 minutes TTL
const cache = new NodeCache({ stdTTL: 300 });

const PRODUCT_LIMIT = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Apply rate limiting to all routes
router.use(limiter);

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

// Helper function to get cache key
function getCacheKey(userId, page, limit) {
  return `products_${userId}_${page}_${limit}`;
}

// GET /api/products → Get authenticated user's products with pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    const vendorId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Check cache first
    const cacheKey = getCacheKey(vendorId, page, limit);
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return res.json(cachedData);
    }

    // Get total count for pagination
    const totalCount = await prisma.product.count({
      where: { vendorId }
    });

    // Get paginated products
    const products = await prisma.product.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    // Parse images from JSON strings to arrays
    const productsWithParsedImages = products.map(product => ({
      ...product,
      images: product.images ? JSON.parse(product.images) : [],
      sizes: product.sizes ? JSON.parse(product.sizes) : [],
      colors: product.colors ? JSON.parse(product.colors) : []
    }));

    const response = {
      products: productsWithParsedImages,
      pagination: {
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
        currentPage: page,
        limit
      }
    };

    // Store in cache
    cache.set(cacheKey, response);

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
        images: images && images.length > 0 ? JSON.stringify(images) : null,
        delivery,
        pickup: pickup || null,
        sizes: sizes && sizes.length > 0 ? JSON.stringify(sizes) : null,
        colors: colors && colors.length > 0 ? JSON.stringify(colors) : null
      }
    });

    // Parse JSON fields back to arrays for response
    const responseProduct = {
      ...product,
      images: product.images ? JSON.parse(product.images) : [],
      sizes: product.sizes ? JSON.parse(product.sizes) : [],
      colors: product.colors ? JSON.parse(product.colors) : []
    };

    // Clear cache for this vendor
    const cachePattern = new RegExp(`^products_${vendorId}_.*`);
    cache.keys().forEach(key => {
      if (cachePattern.test(key)) {
        cache.del(key);
      }
    });

    res.status(201).json(responseProduct);
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

    // Update product
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name: name || existingProduct.name,
        category: category || existingProduct.category,
        description: description || existingProduct.description,
        price: price !== undefined ? parseFloat(price) : existingProduct.price,
        quantity: quantity !== undefined ? parseInt(quantity) : existingProduct.quantity,
        images: images !== undefined ? (images && images.length > 0 ? JSON.stringify(images) : null) : existingProduct.images,
        delivery: delivery !== undefined ? delivery : existingProduct.delivery,
        pickup: pickup !== undefined ? pickup : existingProduct.pickup,
        sizes: sizes !== undefined ? (sizes && sizes.length > 0 ? JSON.stringify(sizes) : null) : existingProduct.sizes,
        colors: colors !== undefined ? (colors && colors.length > 0 ? JSON.stringify(colors) : null) : existingProduct.colors
      }
    });

    // Parse JSON fields back to arrays for response
    const responseProduct = {
      ...updatedProduct,
      images: updatedProduct.images ? JSON.parse(updatedProduct.images) : [],
      sizes: updatedProduct.sizes ? JSON.parse(updatedProduct.sizes) : [],
      colors: updatedProduct.colors ? JSON.parse(updatedProduct.colors) : []
    };

    // Clear cache for this vendor
    const cachePattern = new RegExp(`^products_${vendorId}_.*`);
    cache.keys().forEach(key => {
      if (cachePattern.test(key)) {
        cache.del(key);
      }
    });

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

    // Clear cache for this vendor
    const cachePattern = new RegExp(`^products_${vendorId}_.*`);
    cache.keys().forEach(key => {
      if (cachePattern.test(key)) {
        cache.del(key);
      }
    });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// POST /api/products/import-csv → Import products from CSV (bulk upload)
router.post('/import-csv', authenticateToken, async (req, res) => {
  try {
    const vendorId = req.user.userId;
    const { csvData, overwrite = false } = req.body;

    if (!csvData || !Array.isArray(csvData)) {
      return res.status(400).json({ error: 'CSV data is required and must be an array' });
    }

    // Check current product count
    const existingProductsCount = await prisma.product.count({
      where: { vendorId }
    });

    const newProductsCount = csvData.length;
    const totalProductsAfterImport = existingProductsCount + newProductsCount;

    if (totalProductsAfterImport > PRODUCT_LIMIT) {
      return res.status(403).json({ 
        error: `Import would exceed product limit. You can have maximum ${PRODUCT_LIMIT} products. Current: ${existingProductsCount}, Attempting to add: ${newProductsCount}` 
      });
    }

    const importResults = {
      success: 0,
      errors: [],
      created: []
    };

    // Process each CSV row
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      
      try {
        // Validate required fields
        if (!row.name || !row.category || !row.description || !row.price || row.quantity === undefined) {
          importResults.errors.push({
            row: i + 1,
            error: 'Missing required fields: name, category, description, price, quantity'
          });
          continue;
        }

        // Parse price and quantity
        const price = parseFloat(row.price);
        const quantity = parseInt(row.quantity);

        if (isNaN(price) || price < 0) {
          importResults.errors.push({
            row: i + 1,
            error: 'Invalid price value'
          });
          continue;
        }

        if (isNaN(quantity) || quantity < 0) {
          importResults.errors.push({
            row: i + 1,
            error: 'Invalid quantity value'
          });
          continue;
        }

        // Parse optional JSON fields
        let images = [];
        let sizes = [];
        let colors = [];

        try {
          if (row.images && typeof row.images === 'string') {
            images = row.images.split(';').map(img => img.trim()).filter(img => img);
          } else if (Array.isArray(row.images)) {
            images = row.images;
          }

          if (row.sizes && typeof row.sizes === 'string') {
            sizes = row.sizes.split(';').map(size => size.trim()).filter(size => size);
          } else if (Array.isArray(row.sizes)) {
            sizes = row.sizes;
          }

          if (row.colors && typeof row.colors === 'string') {
            colors = row.colors.split(';').map(color => color.trim()).filter(color => color);
          } else if (Array.isArray(row.colors)) {
            colors = row.colors;
          }
        } catch (parseError) {
          console.warn('Error parsing optional fields for row', i + 1, parseError);
        }

        // Check if product with same name exists for this vendor
        const existingProduct = await prisma.product.findFirst({
          where: {
            vendorId,
            name: row.name
          }
        });

        if (existingProduct && !overwrite) {
          importResults.errors.push({
            row: i + 1,
            error: `Product "${row.name}" already exists. Use overwrite option to update.`
          });
          continue;
        }

        const productData = {
          vendorId,
          name: row.name,
          category: row.category,
          description: row.description,
          price,
          quantity,
          images: images.length > 0 ? JSON.stringify(images) : null,
          delivery: row.delivery === true || row.delivery === 'true' || row.delivery === 'Yes' || row.delivery === 'yes',
          pickup: row.pickup || null,
          sizes: sizes.length > 0 ? JSON.stringify(sizes) : null,
          colors: colors.length > 0 ? JSON.stringify(colors) : null,
          status: row.status || 'active'
        };

        let product;
        if (existingProduct && overwrite) {
          // Update existing product
          product = await prisma.product.update({
            where: { id: existingProduct.id },
            data: productData
          });
        } else {
          // Create new product
          product = await prisma.product.create({
            data: productData
          });
        }

        // Parse JSON fields back to arrays for response
        const responseProduct = {
          ...product,
          images: product.images ? JSON.parse(product.images) : [],
          sizes: product.sizes ? JSON.parse(product.sizes) : [],
          colors: product.colors ? JSON.parse(product.colors) : []
        };

        importResults.created.push(responseProduct);
        importResults.success++;

      } catch (error) {
        console.error('Error processing row', i + 1, error);
        importResults.errors.push({
          row: i + 1,
          error: error.message || 'Failed to process product'
        });
      }
    }

    // Clear cache for this vendor
    const cachePattern = new RegExp(`^products_${vendorId}_.*`);
    cache.keys().forEach(key => {
      if (cachePattern.test(key)) {
        cache.del(key);
      }
    });

    res.json({
      message: `Import completed. ${importResults.success} products processed successfully.`,
      results: importResults,
      summary: {
        total: csvData.length,
        success: importResults.success,
        errors: importResults.errors.length
      }
    });

  } catch (error) {
    console.error('Error importing CSV:', error);
    res.status(500).json({ error: 'Failed to import CSV data' });
  }
});

// POST /api/products/bulk-operations → Bulk operations for smart collections
router.post('/bulk-operations', authenticateToken, async (req, res) => {
  try {
    const vendorId = req.user.userId;
    const { operation, productIds, updates } = req.body;

    if (!operation || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: 'Operation and product IDs are required' });
    }

    let result;

    switch (operation) {
      case 'update':
        if (!updates || typeof updates !== 'object') {
          return res.status(400).json({ error: 'Updates object is required for update operation' });
        }

        // Validate that all products belong to the user
        const userProducts = await prisma.product.findMany({
          where: {
            id: { in: productIds },
            vendorId
          },
          select: { id: true }
        });

        if (userProducts.length !== productIds.length) {
          return res.status(403).json({ error: 'Some products do not belong to you or do not exist' });
        }

        // Prepare update data
        const updateData = {};
        if (updates.category) updateData.category = updates.category;
        if (updates.status) updateData.status = updates.status;
        if (updates.delivery !== undefined) updateData.delivery = updates.delivery;
        if (updates.price !== undefined) updateData.price = parseFloat(updates.price);
        if (updates.quantity !== undefined) updateData.quantity = parseInt(updates.quantity);

        // Perform bulk update
        result = await prisma.product.updateMany({
          where: {
            id: { in: productIds },
            vendorId
          },
          data: updateData
        });
        break;

      case 'delete':
        // Validate that all products belong to the user
        const userProductsToDelete = await prisma.product.findMany({
          where: {
            id: { in: productIds },
            vendorId
          },
          select: { id: true }
        });

        if (userProductsToDelete.length !== productIds.length) {
          return res.status(403).json({ error: 'Some products do not belong to you or do not exist' });
        }

        // Perform bulk delete
        result = await prisma.product.deleteMany({
          where: {
            id: { in: productIds },
            vendorId
          }
        });
        break;

      case 'activate':
        result = await prisma.product.updateMany({
          where: {
            id: { in: productIds },
            vendorId
          },
          data: { status: 'active' }
        });
        break;

      case 'deactivate':
        result = await prisma.product.updateMany({
          where: {
            id: { in: productIds },
            vendorId
          },
          data: { status: 'inactive' }
        });
        break;

      default:
        return res.status(400).json({ error: 'Invalid operation. Supported: update, delete, activate, deactivate' });
    }

    // Clear cache for this vendor
    const cachePattern = new RegExp(`^products_${vendorId}_.*`);
    cache.keys().forEach(key => {
      if (cachePattern.test(key)) {
        cache.del(key);
      }
    });

    res.json({
      message: `Bulk ${operation} completed successfully`,
      affected: result.count || 0,
      operation,
      productIds
    });

  } catch (error) {
    console.error('Error in bulk operations:', error);
    res.status(500).json({ error: 'Failed to perform bulk operation' });
  }
});

// GET /api/products/collections → Get smart collections (categories, statuses, etc.)
router.get('/collections', authenticateToken, async (req, res) => {
  try {
    const vendorId = req.user.userId;

    // Get products with aggregation
    const products = await prisma.product.findMany({
      where: { vendorId },
      select: {
        id: true,
        name: true,
        category: true,
        status: true,
        price: true,
        quantity: true,
        delivery: true,
        createdAt: true
      }
    });

    // Create smart collections
    const collections = {
      byCategory: {},
      byStatus: {},
      byPriceRange: {
        under_5000: [],
        '5000_15000': [],
        '15000_30000': [],
        over_30000: []
      },
      byStock: {
        inStock: [],
        lowStock: [],
        outOfStock: []
      },
      byDelivery: {
        delivery: [],
        pickupOnly: []
      },
      recent: products.slice(0, 10),
      all: products
    };

    // Group by category
    products.forEach(product => {
      const category = product.category || 'Uncategorized';
      if (!collections.byCategory[category]) {
        collections.byCategory[category] = [];
      }
      collections.byCategory[category].push(product);
    });

    // Group by status
    products.forEach(product => {
      const status = product.status || 'active';
      if (!collections.byStatus[status]) {
        collections.byStatus[status] = [];
      }
      collections.byStatus[status].push(product);
    });

    // Group by price range
    products.forEach(product => {
      const price = product.price || 0;
      if (price < 5000) {
        collections.byPriceRange.under_5000.push(product);
      } else if (price >= 5000 && price < 15000) {
        collections.byPriceRange['5000_15000'].push(product);
      } else if (price >= 15000 && price < 30000) {
        collections.byPriceRange['15000_30000'].push(product);
      } else {
        collections.byPriceRange.over_30000.push(product);
      }
    });

    // Group by stock levels
    products.forEach(product => {
      const quantity = product.quantity || 0;
      if (quantity === 0) {
        collections.byStock.outOfStock.push(product);
      } else if (quantity <= 10) {
        collections.byStock.lowStock.push(product);
      } else {
        collections.byStock.inStock.push(product);
      }
    });

    // Group by delivery
    products.forEach(product => {
      if (product.delivery) {
        collections.byDelivery.delivery.push(product);
      } else {
        collections.byDelivery.pickupOnly.push(product);
      }
    });

    res.json({
      collections,
      summary: {
        total: products.length,
        categories: Object.keys(collections.byCategory).length,
        statuses: Object.keys(collections.byStatus),
        stockLevels: {
          inStock: collections.byStock.inStock.length,
          lowStock: collections.byStock.lowStock.length,
          outOfStock: collections.byStock.outOfStock.length
        }
      }
    });

  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
});

module.exports = router; 