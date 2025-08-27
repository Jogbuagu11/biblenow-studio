#!/bin/bash

# Jitsi JWT Endpoint Tests
# Tests both Express and Next.js implementations

echo "🧪 Testing Jitsi JWT Endpoints with curl"
echo "=========================================="

# Test data
ROOM="test-room"
NAME="Test User"
EMAIL="test@biblenowstudio.com"
MODERATOR="false"

echo ""
echo "1️⃣ Testing Express Local Endpoint:"
echo "   URL: http://localhost:3001/api/jitsi/token"
echo ""

curl -X POST http://localhost:3001/api/jitsi/token \
  -H "Content-Type: application/json" \
  -d "{
    \"room\": \"$ROOM\",
    \"name\": \"$NAME\",
    \"email\": \"$EMAIL\",
    \"moderator\": $MODERATOR
  }" \
  -w "\n\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"

echo ""
echo "2️⃣ Testing Express Production Endpoint:"
echo "   URL: https://biblenow-studio-backend.onrender.com/api/jitsi/token"
echo ""

curl -X POST https://biblenow-studio-backend.onrender.com/api/jitsi/token \
  -H "Content-Type: application/json" \
  -d "{
    \"room\": \"$ROOM\",
    \"name\": \"$NAME\",
    \"email\": \"$EMAIL\",
    \"moderator\": $MODERATOR
  }" \
  -w "\n\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"

echo ""
echo "3️⃣ Testing Next.js Local Endpoint:"
echo "   URL: http://localhost:3000/api/jitsi/token"
echo ""

curl -X POST http://localhost:3000/api/jitsi/token \
  -H "Content-Type: application/json" \
  -d "{
    \"room\": \"$ROOM\",
    \"name\": \"$NAME\",
    \"email\": \"$EMAIL\",
    \"moderator\": $MODERATOR
  }" \
  -w "\n\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"

echo ""
echo "4️⃣ Testing Error Cases:"
echo ""

echo "   Testing missing room:"
curl -X POST http://localhost:3001/api/jitsi/token \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"$NAME\",
    \"email\": \"$EMAIL\"
  }" \
  -w "\n\nHTTP Status: %{http_code}\n"

echo ""
echo "   Testing empty room:"
curl -X POST http://localhost:3001/api/jitsi/token \
  -H "Content-Type: application/json" \
  -d "{
    \"room\": \"\",
    \"name\": \"$NAME\",
    \"email\": \"$EMAIL\"
  }" \
  -w "\n\nHTTP Status: %{http_code}\n"

echo ""
echo "5️⃣ Testing Moderator Token:"
echo ""

curl -X POST http://localhost:3001/api/jitsi/token \
  -H "Content-Type: application/json" \
  -d "{
    \"room\": \"moderator-room\",
    \"name\": \"Test Moderator\",
    \"email\": \"moderator@biblenowstudio.com\",
    \"moderator\": true
  }" \
  -w "\n\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"

echo ""
echo "✅ Test Summary:"
echo "   - All endpoints should return 200 OK"
echo "   - Response should contain 'jwt' field"
echo "   - Error cases should return 400 Bad Request"
echo "   - JWT tokens should be valid and decodeable" 