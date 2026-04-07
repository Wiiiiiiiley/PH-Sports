#!/bin/bash

# Test script to verify student can create venue bookings

API_BASE="http://localhost:8788/api"

echo "🧪 Testing Venue Booking functionality..."
echo ""

# 1. Register a test student
echo "1️⃣  Registering test student..."
STUDENT_RESPONSE=$(curl -s -X POST "$API_BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.student@example.com",
    "password": "TestPass123",
    "full_name": "Test Student",
    "role": "student"
  }')

STUDENT_TOKEN=$(echo "$STUDENT_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
STUDENT_EMAIL=$(echo "$STUDENT_RESPONSE" | grep -o '"email":"[^"]*' | cut -d'"' -f4)

if [ -z "$STUDENT_TOKEN" ]; then
  echo "❌ Failed to register student"
  echo "Response: $STUDENT_RESPONSE"
  exit 1
fi

echo "✅ Student created: $STUDENT_EMAIL"
echo "   Token: ${STUDENT_TOKEN:0:20}..."
echo ""

# 2. Try to create a venue booking as student
echo "2.0  Creating venue booking as student..."
BOOKING_RESPONSE=$(curl -s -X POST "$API_BASE/venue-bookings?token=$STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "team_id": "2026-04-07 14:22:12-basketball",
    "venue": "Gym A",
    "date": "2026-04-15",
    "time_slot": "15:00",
    "duration": 2,
    "purpose": "Team training session",
    "booked_by_name": "Test Student"
  }')

echo "Response: $BOOKING_RESPONSE"
echo ""

# Check if booking was created successfully
if echo "$BOOKING_RESPONSE" | grep -q '"status":"pending"'; then
  echo "✅ SUCCESS! Student can create venue bookings with status: pending"
  BOOKING_ID=$(echo "$BOOKING_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  echo "   Booking ID: $BOOKING_ID"
elif echo "$BOOKING_RESPONSE" | grep -q '"error"'; then
  ERROR=$(echo "$BOOKING_RESPONSE" | grep -o '"error":"[^"]*' | cut -d'"' -f4)
  echo "❌ FAILED: $ERROR"
  exit 1
else
  echo "⚠️  Unexpected response:"
  echo "$BOOKING_RESPONSE"
fi

echo ""
echo "✨ Test completed!"
