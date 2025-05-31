const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/upload/image - Upload single image as base64
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
      success: true,
      imageUrl: image,
      filename: filename || 'uploaded-image',
      size: `${Math.round(sizeInBytes / 1024 / 1024)}MB`,
      uploadedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// POST /api/upload/images - Upload multiple images in bulk
router.post('/images', authenticateToken, async (req, res) => {
  try {
    const { images } = req.body;

    if (!images || !Array.isArray(images)) {
      return res.status(400).json({ error: 'No images data provided or invalid format' });
    }

    if (images.length === 0) {
      return res.status(400).json({ error: 'No images to upload' });
    }

    if (images.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 images allowed per bulk upload' });
    }

    const results = [];
    const errors = [];

    // Process each image
    for (let i = 0; i < images.length; i++) {
      const { image, filename } = images[i];
      
      try {
        // Validate base64 image
        const base64Pattern = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/;
        if (!base64Pattern.test(image)) {
          errors.push({ index: i, filename, error: 'Invalid image format' });
          continue;
        }

        // Check image size
        const sizeInBytes = Buffer.byteLength(image, 'utf8');
        const maxSize = 50 * 1024 * 1024; // 50MB
        
        if (sizeInBytes > maxSize) {
          errors.push({ 
            index: i, 
            filename, 
            error: 'Image too large',
            size: `${Math.round(sizeInBytes / 1024 / 1024)}MB`
          });
          continue;
        }

        // Success
        results.push({
          index: i,
          imageUrl: image,
          filename: filename || `uploaded-image-${i + 1}`,
          size: `${Math.round(sizeInBytes / 1024 / 1024)}MB`,
          uploadedAt: new Date().toISOString()
        });

      } catch (error) {
        errors.push({ 
          index: i, 
          filename, 
          error: 'Processing failed',
          details: error.message 
        });
      }
    }

    // Return results
    res.json({
      success: true,
      totalImages: images.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ error: 'Failed to process bulk upload' });
  }
});

// DELETE /api/upload/image - Delete image
router.delete('/image', authenticateToken, async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'No image URL provided' });
    }

    // Since we're storing base64 images, we don't need to delete from filesystem
    // This endpoint is for API compatibility
    res.json({ 
      success: true,
      message: 'Image reference removed successfully',
      imageUrl 
    });

  } catch (error) {
    console.error('Image deletion error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// GET /api/upload/presigned-url - Get a presigned URL for uploading (legacy support)
router.get('/presigned-url', authenticateToken, async (req, res) => {
  // Return a dummy response for backward compatibility
  res.json({
    message: 'Please use POST /api/upload/image for direct base64 upload or POST /api/upload/images for bulk upload',
    singleUploadUrl: '/api/upload/image',
    bulkUploadUrl: '/api/upload/images',
    method: 'POST'
  });
});

module.exports = router;