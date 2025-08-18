import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { room } = req.query;
  const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
  
  try {
    const targetUrl = `https://studio.biblenow.io/live?room=${encodeURIComponent(room)}${queryString}`;
    
    console.log(`Proxying /live/${room} to: ${targetUrl}`);
    
    // Make request to studio.biblenow.io with Accept-Encoding disabled
    const response = await fetch(targetUrl, {
      headers: {
        'Accept-Encoding': '', // Disable gzip compression
        'User-Agent': req.headers['user-agent'] || 'BibleNOW-Proxy/1.0',
        'Accept': req.headers.accept || '*/*',
        'Accept-Language': req.headers['accept-language'] || 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    console.log(`Upstream response status: ${response.status}`);
    console.log(`Upstream content-type: ${response.headers.get('content-type')}`);

    // Forward the response status and headers
    res.status(response.status);
    
    // Copy relevant headers from the upstream response
    const headersToForward = [
      'content-type',
      'content-length',
      'cache-control',
      'expires',
      'last-modified',
      'etag'
    ];
    
    headersToForward.forEach(header => {
      const value = response.headers.get(header);
      if (value) {
        res.setHeader(header, value);
        console.log(`Forwarding header ${header}: ${value}`);
      }
    });

    // Get the response body and send it
    const body = await response.text();
    res.send(body);
    
  } catch (error) {
    console.error('Error proxying /live request:', error);
    res.status(500).json({ error: 'Failed to proxy request to studio' });
  }
} 