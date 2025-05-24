const { PrismaClient } = require('@prisma/client');
const { verifyToken } = require('../auth');

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
  const authResult = verifyToken(req);
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  const userId = authResult.user.userId;
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  try {
    // Verify product belongs to user
    const existingProduct = await prisma.product.findFirst({
      where: { id, userId }
    });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (req.method === 'PUT') {
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

      // Update product
      const updatedProduct = await prisma.product.update({
        where: { id },
        data: {
          title,
          description,
          price: parseFloat(price),
          category,
          status: status || 'DRAFT',
          inventory: inventory ? parseInt(inventory) : null,
          delivery: delivery || null,
          estimatedDelivery: estimatedDelivery || null,
          images: images || []
        }
      });

      res.json(updatedProduct);

    } else if (req.method === 'DELETE') {
      // Delete product
      await prisma.product.delete({
        where: { id }
      });

      res.json({ message: 'Product deleted successfully' });

    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Product API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
} 