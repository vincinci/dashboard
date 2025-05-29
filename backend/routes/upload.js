const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/upload/image - Upload image as base64
router.post('/image', authenticateToken, async (req, res) => {
  try {
    const { image, filename } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // Validate base64 image
    const base64Pattern = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/;
    if (!base64Pattern.test(image)) {
      return res.status(400).json({ error: 'Invalid image format' });
    }

    // Check image size (base64 encoded)
    const sizeInBytes = Buffer.byteLength(image, 'utf8');
    const maxSize = 50 * 1024 * 1024; // 50MB to match server limits
    
    if (sizeInBytes > maxSize) {
      return res.status(413).json({ 
        error: 'Image too large', 
        message: 'Image exceeds 50MB limit',
        size: `${Math.round(sizeInBytes / 1024 / 1024)}MB`
      });
    }

    // Return the image URL (the base64 data itself)
    res.json({
      imageUrl: image,
      filename: filename || 'uploaded-image',
      size: `${Math.round(sizeInBytes / 1024 / 1024)}MB`
    });

  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// GET /api/upload/presigned-url - Get a presigned URL for uploading (legacy support)
router.get('/presigned-url', authenticateToken, async (req, res) => {
  // Return a dummy response for backward compatibility
  res.json({
    message: 'Please use POST /api/upload/image for direct base64 upload',
    uploadUrl: '/api/upload/image',
    method: 'POST'
  });
});

module.exports = router;