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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // For now, return placeholder image URLs
    // TODO: Implement Vercel Blob storage
    const placeholderImages = [
      'https://via.placeholder.com/400x300/f59e0b/ffffff?text=Product+Image+1',
      'https://via.placeholder.com/400x300/374151/ffffff?text=Product+Image+2',
      'https://via.placeholder.com/400x300/6b7280/ffffff?text=Product+Image+3'
    ];

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    res.json({
      success: true,
      images: placeholderImages.slice(0, Math.floor(Math.random() * 3) + 1),
      message: 'Images uploaded successfully (placeholder URLs)'
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 