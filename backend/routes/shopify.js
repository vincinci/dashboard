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

// POST /api/shopify/connect → Connect to Shopify store
router.post('/connect', authenticateToken, async (req, res) => {
  try {
    const vendorId = req.user.userId;
    const { shopifyStoreUrl, accessToken } = req.body;

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

    // Check if user already has Shopify connection
    const existingConnection = await prisma.shopifyConnection.findFirst({
      where: { vendorId }
    });

    let connection;
    if (existingConnection) {
      // Update existing connection
      connection = await prisma.shopifyConnection.update({
        where: { id: existingConnection.id },
        data: {
          shopifyStoreUrl,
          accessToken,
          isActive: true,
          lastSyncAt: null // Reset sync status
        }
      });
    } else {
      // Create new connection
      connection = await prisma.shopifyConnection.create({
        data: {
          vendorId,
          shopifyStoreUrl,
          accessToken,
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

// GET /api/shopify/connection → Get current Shopify connection status
router.get('/connection', authenticateToken, async (req, res) => {
  try {
    const vendorId = req.user.userId;

    const connection = await prisma.shopifyConnection.findFirst({
      where: { vendorId },
      select: {
        id: true,
        shopifyStoreUrl: true,
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

// POST /api/shopify/sync-products → Sync products to Shopify
router.post('/sync-products', authenticateToken, async (req, res) => {
  try {
    const vendorId = req.user.userId;
    const { productIds } = req.body; // Optional: sync specific products

    // Get Shopify connection
    const connection = await prisma.shopifyConnection.findFirst({
      where: { vendorId, isActive: true }
    });

    if (!connection) {
      return res.status(400).json({ error: 'No active Shopify connection found. Please connect to Shopify first.' });
    }

    // Get products to sync
    const whereClause = { vendorId };
    if (productIds && productIds.length > 0) {
      whereClause.id = { in: productIds };
    }

    const products = await prisma.product.findMany({
      where: whereClause
    });

    if (products.length === 0) {
      return res.status(400).json({ error: 'No products found to sync' });
    }

    const syncResults = {
      success: 0,
      errors: [],
      synced: []
    };

    // Sync each product to Shopify
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
                sku: `${product.id}-${size}-${color}`.replace(/\s+/g, '-').toUpperCase()
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
              sku: `${product.id}-${size}`.replace(/\s+/g, '-').toUpperCase()
            });
          });
        } else if (colors.length > 0) {
          // Create variants for each color
          colors.forEach(color => {
            variants.push({
              option1: color,
              price: product.price.toString(),
              inventory_quantity: Math.floor(product.quantity / colors.length),
              sku: `${product.id}-${color}`.replace(/\s+/g, '-').toUpperCase()
            });
          });
        } else {
          // Single variant
          variants.push({
            price: product.price.toString(),
            inventory_quantity: product.quantity,
            sku: `${product.id}`.toUpperCase()
          });
        }

        // Prepare Shopify product data
        const shopifyProduct = {
          product: {
            title: product.name,
            body_html: product.description,
            product_type: product.category,
            status: product.status === 'active' ? 'active' : 'draft',
            variants: variants,
            images: images.map(img => ({ src: img }))
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

        // Check if product already exists in Shopify (by SKU or title)
        let existingProduct = null;
        try {
          const searchResponse = await axios.get(
            `https://${connection.shopifyStoreUrl}/admin/api/2024-10/products.json?title=${encodeURIComponent(product.name)}`,
            {
              headers: {
                'X-Shopify-Access-Token': connection.accessToken,
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (searchResponse.data.products && searchResponse.data.products.length > 0) {
            existingProduct = searchResponse.data.products[0];
          }
        } catch (searchError) {
          console.warn('Error searching for existing product:', searchError.message);
        }

        let shopifyResponse;
        if (existingProduct) {
          // Update existing product
          shopifyResponse = await axios.put(
            `https://${connection.shopifyStoreUrl}/admin/api/2024-10/products/${existingProduct.id}.json`,
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
          shopifyId: shopifyResponse.data.product.id,
          action: existingProduct ? 'updated' : 'created'
        });
        syncResults.success++;

      } catch (error) {
        console.error(`Error syncing product ${product.id}:`, error);
        syncResults.errors.push({
          productId: product.id,
          productName: product.name,
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

// DELETE /api/shopify/disconnect → Disconnect from Shopify
router.delete('/disconnect', authenticateToken, async (req, res) => {
  try {
    const vendorId = req.user.userId;

    const connection = await prisma.shopifyConnection.findFirst({
      where: { vendorId }
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

module.exports = router; 