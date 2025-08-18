import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { roomTitle, isModerator, displayName, email, avatar } = req.body || {};
    
    if (!roomTitle) {
      return res.status(400).json({ error: 'roomTitle is required' });
    }

    const APP_ID = process.env.JITSI_JWT_APP_ID || 'biblenow';
    const SECRET = process.env.JITSI_JWT_SECRET;
    const SUBJECT = process.env.JITSI_SUBJECT || 'stream.biblenow.io';

    if (!SECRET) {
      return res.status(500).json({ error: 'Server JWT secret not configured' });
    }

    // Simple slug enforcement (must match client)
    const raw = String(roomTitle);
    const lastSegment = raw.includes('/') ? raw.split('/').filter(Boolean).pop() : raw;
    const noPrefix = lastSegment.replace(/^vpaas-magic-cookie-[a-z0-9]+-?/i, '');
    const room = noPrefix
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      aud: APP_ID,
      iss: APP_ID,
      sub: SUBJECT,
      room,
      nbf: now - 5,
      exp: now + 3600,
      context: {
        user: {
          name: displayName || 'BibleNOW Viewer',
          email: email || undefined,
          avatar: avatar || undefined,
          moderator: !!isModerator
        },
        features: {
          'screen-sharing': !!isModerator,
          livestreaming: false,
          recording: false
        }
      }
    };

    const token = jwt.sign(payload, SECRET, { algorithm: 'HS256' });
    return res.json({ token, room });
  } catch (e) {
    console.error('Error creating Jitsi token:', e);
    return res.status(500).json({ error: 'Failed to create token' });
  }
} 