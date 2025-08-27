#!/usr/bin/env node

/**
 * Test script to try different JWT configurations
 * This will help identify the correct JWT format for your Jitsi server
 */

const jwt = require('jsonwebtoken');

function testDifferentJWTConfigs() {
  console.log('🔧 Testing Different JWT Configurations...\n');

  const roomName = 'test-room';
  const secret = process.env.JITSI_JWT_SECRET || 'your_very_strong_secret_key_here_minimum_32_chars';
  const now = Math.floor(Date.now() / 1000);

  const configs = [
    {
      name: 'Config 1: Minimal JWT (no sub, no context)',
      description: 'Most basic JWT structure',
      payload: {
        aud: 'biblenow',
        iss: 'biblenow',
        room: roomName,
        exp: now + 3600,
        iat: now,
        nbf: now - 5
      }
    },
    {
      name: 'Config 2: With sub claim',
      description: 'JWT with sub claim',
      payload: {
        aud: 'biblenow',
        iss: 'biblenow',
        sub: 'stream.biblenow.io',
        room: roomName,
        exp: now + 3600,
        iat: now,
        nbf: now - 5
      }
    },
    {
      name: 'Config 3: With user context only',
      description: 'JWT with user context but no features',
      payload: {
        aud: 'biblenow',
        iss: 'biblenow',
        room: roomName,
        exp: now + 3600,
        iat: now,
        nbf: now - 5,
        context: {
          user: {
            id: 'test@biblenowstudio.com',
            name: 'Test User',
            email: 'test@biblenowstudio.com',
            moderator: true
          }
        }
      }
    },
    {
      name: 'Config 4: Full context (current)',
      description: 'JWT with full context and features',
      payload: {
        aud: 'biblenow',
        iss: 'biblenow',
        room: roomName,
        exp: now + 3600,
        iat: now,
        nbf: now - 5,
        context: {
          user: {
            id: 'test@biblenowstudio.com',
            name: 'Test User',
            email: 'test@biblenowstudio.com',
            moderator: true
          },
          features: {
            'screen-sharing': true,
            livestreaming: true,
            recording: false
          }
        }
      }
    },
    {
      name: 'Config 5: Different aud/iss',
      description: 'JWT with different audience/issuer',
      payload: {
        aud: 'jitsi',
        iss: 'jitsi',
        room: roomName,
        exp: now + 3600,
        iat: now,
        nbf: now - 5
      }
    }
  ];

  console.log('Generated JWT tokens for testing:\n');

  configs.forEach((config, index) => {
    try {
      const token = jwt.sign(config.payload, secret, { algorithm: 'HS256' });
      
      console.log(`${index + 1}. ${config.name}`);
      console.log(`   Description: ${config.description}`);
      console.log(`   Token: ${token}`);
      console.log(`   URL: https://stream.biblenow.io/${roomName}#jwt=${token}`);
      console.log(`   Payload: ${JSON.stringify(config.payload, null, 2)}`);
      console.log('');
    } catch (error) {
      console.log(`${index + 1}. ${config.name} - ERROR: ${error.message}`);
      console.log('');
    }
  });

  console.log('📝 Testing Instructions:');
  console.log('1. Copy each URL above');
  console.log('2. Try accessing each URL in your browser');
  console.log('3. See which one works without "Room and token mismatched" error');
  console.log('4. The working configuration is the correct one for your Jitsi server');
  console.log('');
  console.log('💡 Most likely to work: Config 1 (minimal) or Config 2 (with sub)');
  console.log('💡 If none work, the issue might be with JWT secret or server configuration');
}

testDifferentJWTConfigs(); 