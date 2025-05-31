const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const router = express.Router();
const prisma = new PrismaClient();

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

// Middleware to check if user is admin
function requireAdmin(req, res, next) {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// POST /api/shopify/connect → Admin connects to Shopify store
router.post('/connect', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { shopifyStoreUrl, accessToken, storeName } = req.body;

    if (!shopifyStoreUrl || !accessToken) {
      return res.status(400).json({ error: 'Shopify store URL and access token are required' });
    }

    // Validate the connection by making a test API call
    try {
      const testResponse = await axios.get(`https://${shopifyStoreUrl}/admin/api/2024-10/shop.json`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      });

      if (!testResponse.data.shop) {
        throw new Error('Invalid response from Shopify');
      }
    } catch (error) {
      console.error('Shopify connection test failed:', error);
      return res.status(400).json({ 
        error: 'Failed to connect to Shopify. Please check your store URL and access token.' 
      });
    }

    // Check if admin already has Shopify connection
    const existingConnection = await prisma.shopifyConnection.findFirst({
      where: { adminId }
    });

    let connection;
    if (existingConnection) {
      // Update existing connection
      connection = await prisma.shopifyConnection.update({
        where: { id: existingConnection.id },
        data: {
          shopifyStoreUrl,
          accessToken,
          storeName: storeName || shopifyStoreUrl,
          isActive: true,
          lastSyncAt: null // Reset sync status
        }
      });
    } else {
      // Create new connection
      connection = await prisma.shopifyConnection.create({
        data: {
          adminId,
          shopifyStoreUrl,
          accessToken,
          storeName: storeName || shopifyStoreUrl,
          isActive: true
        }
      });
    }

    // Don't return the access token in the response for security
    const { accessToken: _, ...safeConnection } = connection;

    res.json({
      message: 'Successfully connected to Shopify',
      connection: safeConnection
    });

  } catch (error) {
    console.error('Error connecting to Shopify:', error);
    res.status(500).json({ error: 'Failed to connect to Shopify' });
  }
});

// GET /api/shopify/connection → Get current Shopify connection status (admin only)
router.get('/connection', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const adminId = req.user.userId;

    const connection = await prisma.shopifyConnection.findFirst({
      where: { adminId },
      select: {
        id: true,
        shopifyStoreUrl: true,
        storeName: true,
        isActive: true,
        lastSyncAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!connection) {
      return res.json({ connected: false, connection: null });
    }

    res.json({ 
      connected: true, 
      connection: {
        ...connection,
        storeUrl: `https://${connection.shopifyStoreUrl}`
      }
    });

  } catch (error) {
    console.error('Error fetching Shopify connection:', error);
    res.status(500).json({ error: 'Failed to fetch Shopify connection' });
  }
});

// GET /api/shopify/products → Get all products with verification status (admin only)
router.get('/products', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, vendor, verified } = req.query;

    const whereClause = {};
    
    if (status && status !== 'all') {
      whereClause.status = status;
    }
    
    if (vendor) {
      whereClause.vendorId = vendor;
    }
    
    if (verified !== undefined) {
      whereClause.isVerified = verified === 'true';
    }

    const skip = (page - 1) * limit;
    
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        include: {
          vendor: {
            select: {
              id: true,
              displayName: true,
              businessName: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.product.count({ where: whereClause })
    ]);

    const pagination = {
      currentPage: parseInt(page),
      pages: Math.ceil(total / limit),
      total,
      limit: parseInt(limit)
    };

    res.json({ products, pagination });

  } catch (error) {
    console.error('Error fetching products for admin:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// PUT /api/shopify/products/:id/verify → Admin verify/approve product
router.put('/products/:id/verify', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isVerified, isApprovedForShopify, adminNotes } = req.body;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        vendor: {
          select: { displayName: true, businessName: true, email: true }
        }
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        isVerified: isVerified !== undefined ? isVerified : product.isVerified,
        isApprovedForShopify: isApprovedForShopify !== undefined ? isApprovedForShopify : product.isApprovedForShopify,
        adminNotes: adminNotes !== undefined ? adminNotes : product.adminNotes
      },
      include: {
        vendor: {
          select: { displayName: true, businessName: true, email: true }
        }
      }
    });

    res.json({
      message: 'Product verification status updated successfully',
      product: updatedProduct
    });

  } catch (error) {
    console.error('Error updating product verification:', error);
    res.status(500).json({ error: 'Failed to update product verification' });
  }
});

// POST /api/shopify/sync-products → Admin sync approved products to Shopify
router.post('/sync-products', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { productIds } = req.body; // Optional: sync specific products

    // Get Shopify connection
    const connection = await prisma.shopifyConnection.findFirst({
      where: { adminId, isActive: true }
    });

    if (!connection) {
      return res.status(400).json({ error: 'No active Shopify connection found. Please connect to Shopify first.' });
    }

    // Get approved products to sync
    const whereClause = { 
      isVerified: true,
      isApprovedForShopify: true
    };
    
    if (productIds && productIds.length > 0) {
      whereClause.id = { in: productIds };
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        vendor: {
          select: { displayName: true, businessName: true, email: true }
        }
      }
    });

    if (products.length === 0) {
      return res.status(400).json({ error: 'No approved products found to sync' });
    }

    const syncResults = {
      success: 0,
      errors: [],
      synced: []
    };

    // Sync each approved product to Shopify
    for (const product of products) {
      try {
        // Parse JSON fields
        const images = product.images ? JSON.parse(product.images) : [];
        const sizes = product.sizes ? JSON.parse(product.sizes) : [];
        const colors = product.colors ? JSON.parse(product.colors) : [];

        // Create variants based on sizes and colors
        const variants = [];
        if (sizes.length > 0 && colors.length > 0) {
          // Create variants for each size-color combination
          sizes.forEach(size => {
            colors.forEach(color => {
              variants.push({
                option1: size,
                option2: color,
                price: product.price.toString(),
                inventory_quantity: Math.floor(product.quantity / (sizes.length * colors.length)),
                sku: `${product.vendor.businessName || product.vendor.displayName}-${product.id}-${size}-${color}`.replace(/\s+/g, '-').toUpperCase()
              });
            });
          });
        } else if (sizes.length > 0) {
          // Create variants for each size
          sizes.forEach(size => {
            variants.push({
              option1: size,
              price: product.price.toString(),
              inventory_quantity: Math.floor(product.quantity / sizes.length),
              sku: `${product.vendor.businessName || product.vendor.displayName}-${product.id}-${size}`.replace(/\s+/g, '-').toUpperCase()
            });
          });
        } else if (colors.length > 0) {
          // Create variants for each color
          colors.forEach(color => {
            variants.push({
              option1: color,
              price: product.price.toString(),
              inventory_quantity: Math.floor(product.quantity / colors.length),
              sku: `${product.vendor.businessName || product.vendor.displayName}-${product.id}-${color}`.replace(/\s+/g, '-').toUpperCase()
            });
          });
        } else {
          // Single variant
          variants.push({
            price: product.price.toString(),
            inventory_quantity: product.quantity,
            sku: `${product.vendor.businessName || product.vendor.displayName}-${product.id}`.replace(/\s+/g, '-').toUpperCase()
          });
        }

        // Prepare Shopify product data with vendor information
        const productTitle = `${product.name} - by ${product.vendor.businessName || product.vendor.displayName}`;
        const productDescription = `${product.description}\n\n---\nVendor: ${product.vendor.businessName || product.vendor.displayName}`;

        const shopifyProduct = {
          product: {
            title: productTitle,
            body_html: productDescription,
            product_type: product.category,
            vendor: product.vendor.businessName || product.vendor.displayName,
            status: 'active', // All approved products are active
            variants: variants,
            images: images.map(img => ({ src: img })),
            tags: ['verified', 'marketplace', product.category].join(',')
          }
        };

        // Add options if we have sizes or colors
        if (sizes.length > 0 || colors.length > 0) {
          shopifyProduct.product.options = [];
          if (sizes.length > 0) {
            shopifyProduct.product.options.push({
              name: 'Size',
              values: sizes
            });
          }
          if (colors.length > 0) {
            shopifyProduct.product.options.push({
              name: 'Color',
              values: colors
            });
          }
        }

        // Check if product already exists in Shopify
        let existingProduct = null;
        if (product.shopifyProductId) {
          try {
            const getResponse = await axios.get(
              `https://${connection.shopifyStoreUrl}/admin/api/2024-10/products/${product.shopifyProductId}.json`,
              {
                headers: {
                  'X-Shopify-Access-Token': connection.accessToken,
                  'Content-Type': 'application/json'
                }
              }
            );
            existingProduct = getResponse.data.product;
          } catch (getError) {
            console.warn('Product not found in Shopify, will create new one:', getError.message);
          }
        }

        let shopifyResponse;
        if (existingProduct) {
          // Update existing product
          shopifyResponse = await axios.put(
            `https://${connection.shopifyStoreUrl}/admin/api/2024-10/products/${product.shopifyProductId}.json`,
            shopifyProduct,
            {
              headers: {
                'X-Shopify-Access-Token': connection.accessToken,
                'Content-Type': 'application/json'
              }
            }
          );
        } else {
          // Create new product
          shopifyResponse = await axios.post(
            `https://${connection.shopifyStoreUrl}/admin/api/2024-10/products.json`,
            shopifyProduct,
            {
              headers: {
                'X-Shopify-Access-Token': connection.accessToken,
                'Content-Type': 'application/json'
              }
            }
          );
        }

        // Update product with Shopify ID
        await prisma.product.update({
          where: { id: product.id },
          data: { 
            shopifyProductId: shopifyResponse.data.product.id.toString(),
            lastSyncedAt: new Date()
          }
        });

        syncResults.synced.push({
          productId: product.id,
          productName: product.name,
          vendorName: product.vendor.businessName || product.vendor.displayName,
          shopifyId: shopifyResponse.data.product.id,
          action: existingProduct ? 'updated' : 'created'
        });
        syncResults.success++;

      } catch (error) {
        console.error(`Error syncing product ${product.id}:`, error);
        syncResults.errors.push({
          productId: product.id,
          productName: product.name,
          vendorName: product.vendor.businessName || product.vendor.displayName,
          error: error.response?.data?.errors || error.message
        });
      }
    }

    // Update last sync time
    await prisma.shopifyConnection.update({
      where: { id: connection.id },
      data: { lastSyncAt: new Date() }
    });

    res.json({
      message: `Sync completed. ${syncResults.success} products synced successfully.`,
      results: syncResults,
      summary: {
        total: products.length,
        success: syncResults.success,
        errors: syncResults.errors.length
      }
    });

  } catch (error) {
    console.error('Error syncing products to Shopify:', error);
    res.status(500).json({ error: 'Failed to sync products to Shopify' });
  }
});

// DELETE /api/shopify/disconnect → Admin disconnect from Shopify
router.delete('/disconnect', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const adminId = req.user.userId;

    const connection = await prisma.shopifyConnection.findFirst({
      where: { adminId }
    });

    if (!connection) {
      return res.status(404).json({ error: 'No Shopify connection found' });
    }

    await prisma.shopifyConnection.update({
      where: { id: connection.id },
      data: { isActive: false }
    });

    res.json({ message: 'Successfully disconnected from Shopify' });

  } catch (error) {
    console.error('Error disconnecting from Shopify:', error);
    res.status(500).json({ error: 'Failed to disconnect from Shopify' });
  }
});

// GET /api/shopify/vendors → Get all vendors for filtering (admin only)
router.get('/vendors', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const vendors = await prisma.user.findMany({
      where: { isAdmin: false },
      select: {
        id: true,
        displayName: true,
        businessName: true,
        email: true,
        _count: {
          select: { products: true }
        }
      },
      orderBy: { displayName: 'asc' }
    });

    res.json({ vendors });

  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

module.exports = router; 