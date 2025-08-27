import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

// CORS headers for Next.js
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { room, moderator = false, name, email } = body;

    // Input validation
    if (!room || typeof room !== 'string') {
      return NextResponse.json(
        { 
          error: 'room is required and must be a string',
          hint: 'Provide room name in request body'
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // JWT configuration
    const JITSI_AUD = process.env.JITSI_AUD || 'biblenow';
    const JITSI_ISS = process.env.JITSI_ISS || 'biblenow';
    const JITSI_SUB = process.env.JITSI_SUB || ''; // Optional tenant
               const JWT_SECRET = process.env.JWT_APP_SECRET;

               if (!JWT_SECRET) {
             console.error('JWT_APP_SECRET not configured');
             return NextResponse.json(
               {
                 error: 'JWT secret not configured',
                 hint: 'Set JWT_APP_SECRET environment variable'
               },
               { status: 500, headers: corsHeaders }
             );
           }

    // JWT algorithm (HS256 default, RS256 if specified)
    const algorithm = (process.env.JITSI_JWT_ALGORITHM || 'HS256') as jwt.Algorithm;
    
    // Room name processing (keep exact room name from request)
    const roomName = String(room).trim();
    
    if (!roomName) {
      return NextResponse.json(
        { 
          error: 'room cannot be empty',
          hint: 'Provide a valid room name'
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const now = Math.floor(Date.now() / 1000);
    
               // Build JWT payload
           const payload: any = {
             aud: JITSI_AUD,
             iss: JITSI_ISS,
             room: "*", // Use wildcard for room access
             nbf: now - 10, // 10 seconds before now
             exp: now + 3600, // 1 hour from now
             iat: now,
             context: {
               user: {
                 name: name || 'BibleNOW User',
                 email: email || undefined,
                 moderator: !!moderator
               }
             }
           };

    // Add sub claim only if configured
    if (JITSI_SUB) {
      payload.sub = JITSI_SUB;
    }

    console.log('Generating JWT token:', {
      aud: payload.aud,
      iss: payload.iss,
      room: payload.room,
      sub: payload.sub || 'none',
      moderator: payload.context.user.moderator,
      algorithm
    });

    // Sign JWT
    const token = jwt.sign(payload, JWT_SECRET, { algorithm });
    
    console.log('JWT token generated successfully for room:', roomName);
    
    // Return token in expected format
    return NextResponse.json(
      { 
        jwt: token,
        room: roomName,
        expires: payload.exp
      },
      { headers: corsHeaders }
    );
    
  } catch (error) {
    console.error('Error creating Jitsi JWT token:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { 
          error: 'JWT signing failed',
          hint: 'Check JWT secret and algorithm configuration'
        },
        { status: 500, headers: corsHeaders }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to create JWT token',
        hint: 'Internal server error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
} 