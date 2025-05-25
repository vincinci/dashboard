const express = require('express');
const { put } = require('@vercel/blob');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/upload/presigned-url - Get a presigned URL for uploading
router.get('/presigned-url', authenticateToken, async (req, res) => {
  try {
    // Generate a unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = `product-${uniqueSuffix}.jpg`;

    // Get a presigned URL from Vercel Blob
    const { url: uploadUrl, blob } = await put(filename, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    res.json({
      uploadUrl,
      imageUrl: blob.url
    });

  } catch (error) {
    console.error('Presigned URL error:', error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

module.exports = router;