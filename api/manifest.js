export default function handler(req, res) {
  // Set proper headers for manifest.json
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const manifest = {
    short_name: "BibleNOW Studio",
    name: "BibleNOW Studio",
    description: "BibleNOW Studio - Live streaming platform for Bible study and ministry",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "64x64 32x32 24x24 16x16",
        type: "image/x-icon"
      },
      {
        src: "/logo192.png",
        type: "image/png",
        sizes: "192x192"
      },
      {
        src: "/logo512.png",
        type: "image/png",
        sizes: "512x512"
      }
    ],
    start_url: "/",
    scope: "/",
    display: "standalone",
    theme_color: "#000000",
    background_color: "#ffffff",
    orientation: "portrait-primary",
    categories: ["education", "social", "lifestyle"]
  };

  res.status(200).json(manifest);
} 