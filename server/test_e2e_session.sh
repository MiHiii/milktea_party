#!/bin/bash
# E2E Test for Session Lifecycle (REQ-001)

BASE_URL="http://localhost:8080/api"
HOST_ID="550e8400-e29b-41d4-a716-446655440001"

echo "🚀 Starting E2E Session Lifecycle Test..."

# 1. Create Session (OPEN)
echo "Step 1: Creating Session..."
SESSION_RES=$(curl -s -X POST "$BASE_URL/sessions" \
  -H "Content-Type: application/json" \
  -d "{\"title\": \"E2E Test Party\", \"host_device_id\": \"$HOST_ID\", \"shop_link\": \"https://shopeefood.vn/test\"}")
echo "Response: $SESSION_RES"
# Extract session id specifically
SESSION_ID=$(echo "$SESSION_RES" | sed -n 's/.*"session":{[^}]*"id":"\([^"]*\)".*/\1/p')
echo "✅ Captured Session ID: $SESSION_ID"

if [ -z "$SESSION_ID" ]; then
  echo "❌ Error: Failed to create session."
  exit 1
fi

# 2. Join as Host Participant
echo "Step 2: Joining as Host..."
JOIN_RES=$(curl -s -X POST "$BASE_URL/participants" \
  -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$SESSION_ID\", \"device_id\": \"$HOST_ID\", \"name\": \"The Host\", \"is_host\": true}")
echo "Response: $JOIN_RES"

# 3. Transition: OPEN -> LOCKED
echo "Step 3: Transitioning OPEN -> LOCKED..."
LOCKED_RES=$(curl -s -X PUT "$BASE_URL/sessions/$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d "{\"status\": \"locked\"}")
echo "Response: $LOCKED_RES"

# 4. Transition: LOCKED -> ORDERED
echo "Step 4: Transitioning LOCKED -> ORDERED..."
ORDERED_RES=$(curl -s -X PUT "$BASE_URL/sessions/$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d "{\"status\": \"ordered\"}")
echo "Response: $ORDERED_RES"

# 5. Transition: ORDERED -> SETTLING (P0 - Critical Path)
echo "Step 5: Transitioning ORDERED -> SETTLING (Critical Path)..."
SETTLE_RES=$(curl -s -X PUT "$BASE_URL/sessions/$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d "{\"status\": \"settling\"}")
echo "Response: $SETTLE_RES"

# 6. Negative Test: SETTLING -> OPEN (Invalid)
echo "Step 6: Testing Invalid Transition (SETTLING -> OPEN)..."
ERR_RES=$(curl -s -X PUT "$BASE_URL/sessions/$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d "{\"status\": \"open\"}")
echo "Response: $ERR_RES"

if echo "$ERR_RES" | grep -iq "invalid transition"; then
  echo "✅ Invalid transition rejected correctly."
else
  echo "❌ Error: Expected 'invalid transition' but got something else!"
  exit 1
fi

# 7. Final Transition: SETTLING -> COMPLETED
echo "Step 7: Final Transition -> COMPLETED..."
COMPLETED_RES=$(curl -s -X PUT "$BASE_URL/sessions/$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d "{\"status\": \"completed\"}")
echo "Response: $COMPLETED_RES"

echo -e "\n🏆 E2E TEST COMPLETED SUCCESSFULLY!"
