const { stackServerApp } = require('../config/stack');

// Middleware to verify Stack Auth token
const authenticateStackUser = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify the token with Stack Auth
    const user = await stackServerApp.getUser({ accessToken: token });
    
    if (!user) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Add user information to request
    req.user = {
      userId: user.id,
      id: user.id,
      email: user.primaryEmail,
      displayName: user.displayName
    };
    
    next();
  } catch (error) {
    console.error('Stack Auth verification error:', error);
    return res.status(403).json({ error: 'Authentication failed' });
  }
};

module.exports = { authenticateStackUser }; 