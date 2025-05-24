const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../../utils/auth');

const prisma = new PrismaClient();

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

  // Authenticate user
  const authResult = authenticateToken(req);
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  const userId = authResult.user.userId;

  try {
    if (req.method === 'GET') {
      // Get all products for the authenticated user
      const products = await prisma.product.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });

      res.json(products);

    } else if (req.method === 'POST') {
      // Check product limit (10 products max)
      const productCount = await prisma.product.count({
        where: { userId }
      });

      if (productCount >= 10) {
        return res.status(400).json({ 
          error: 'Product limit reached. You can only have up to 10 products.' 
        });
      }

      const {
        title,
        description,
        price,
        category,
        status,
        inventory,
        delivery,
        estimatedDelivery,
        images
      } = req.body;

      // Validate required fields
      if (!title || !description || !price || !category) {
        return res.status(400).json({ 
          error: 'Title, description, price, and category are required' 
        });
      }

      // Create product
      const product = await prisma.product.create({
        data: {
          title,
          description,
          price: parseFloat(price),
          category,
          status: status || 'DRAFT',
          inventory: inventory ? parseInt(inventory) : null,
          delivery: delivery || null,
          estimatedDelivery: estimatedDelivery || null,
          images: images || [],
          userId
        }
      });

      res.status(201).json(product);

    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Products API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
} 