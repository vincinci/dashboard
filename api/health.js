const cors = require('cors');

const corsMiddleware = cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://dashboard-7jdu5z8p2-fasts-projects-5b1e7db1.vercel.app']
    : ['http://localhost:3000'],
  methods: ['GET', 'OPTIONS'],
  credentials: true,
});

module.exports = async (req, res) => {
  // Handle CORS
  await new Promise((resolve, reject) => {
    corsMiddleware(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });

  // Only allow GET method
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: {
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      nodeEnv: process.env.NODE_ENV
    }
  });
}; 