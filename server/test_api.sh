#!/bin/bash
# Test script for Milktea Party Backend API

BASE_URL="http://localhost:8080/api"
HOST_DEVICE_ID="550e8400-e29b-41d4-a716-446655440000"

echo "1. Checking Health..."
curl -s -X GET "$BASE_URL/../health" | json_pp || curl -s -X GET "$BASE_URL/../health"
echo -e "\n"

echo "2. Creating a Session..."
SESSION_RES=$(curl -s -X POST "$BASE_URL/sessions" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Test Party Trà Sữa\",
    \"host_device_id\": \"$HOST_DEVICE_ID\",
    \"shop_link\": \"https://shopeefood.vn/tra-sua-tocotoco\"
  }")

echo "$SESSION_RES" | json_pp || echo "$SESSION_RES"
SESSION_ID=$(echo "$SESSION_RES" | grep -oP '"id":"\K[^"]+')
SESSION_SLUG=$(echo "$SESSION_RES" | grep -oP '"slug":"\K[^"]+')
echo -e "Created Session ID: $SESSION_ID, Slug: $SESSION_SLUG\n"

if [ -z "$SESSION_ID" ]; then
    echo "Failed to create session, stopping test."
    exit 1
fi

echo "3. Getting Session by Slug..."
curl -s -X GET "$BASE_URL/sessions/slug/$SESSION_SLUG" | json_pp || curl -s -X GET "$BASE_URL/sessions/slug/$SESSION_SLUG"
echo -e "\n"

echo "4. Creating a Participant..."
PARTICIPANT_RES=$(curl -s -X POST "$BASE_URL/participants" \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": \"$SESSION_ID\",
    \"name\": \"MiHi\",
    \"is_host\": true
  }")

echo "$PARTICIPANT_RES" | json_pp || echo "$PARTICIPANT_RES"
PARTICIPANT_ID=$(echo "$PARTICIPANT_RES" | grep -oP '"id":"\K[^"]+')
echo -e "Created Participant ID: $PARTICIPANT_ID\n"

echo "5. Heartbeat for Participant..."
curl -s -X POST "$BASE_URL/participants/$PARTICIPANT_ID/heartbeat" -I | grep "HTTP/"
echo -e "\n"

echo "Test completed!"
