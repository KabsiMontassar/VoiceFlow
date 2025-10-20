// Test script to verify API functionality
// Run this in your browser console on the VoiceFlow frontend page

console.log('Testing VoiceFlow API...');

// Get the auth token from localStorage
const token = localStorage.getItem('authToken') || localStorage.getItem('accessToken');
console.log('Auth token:', token ? 'Found' : 'Not found');

if (!token) {
  console.error('No auth token found. Please login first.');
} else {
  // Test the API endpoints
  const API_BASE = 'http://localhost:3000';
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Test 1: List user rooms
  console.log('1. Testing list user rooms...');
  fetch(`${API_BASE}/api/v1/rooms`, { headers })
    .then(res => res.json())
    .then(data => {
      console.log('List rooms response:', data);
      if (data.success) {
        console.log('✅ List rooms working. Found', data.data?.rooms?.length || 0, 'rooms');
        if (data.data?.rooms?.length > 0) {
          console.log('Room details:', data.data.rooms[0]);
        }
      } else {
        console.error('❌ List rooms failed:', data.message);
      }
    })
    .catch(err => console.error('❌ List rooms error:', err));

  // Test 2: Create a test room
  console.log('2. Testing create room...');
  fetch(`${API_BASE}/api/v1/rooms`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: `Test Room ${Date.now()}`,
      description: 'API Test Room',
      maxUsers: 10
    })
  })
    .then(res => res.json())
    .then(data => {
      console.log('Create room response:', data);
      if (data.success) {
        console.log('✅ Create room working. Room ID:', data.data?.id);
        console.log('Room code:', data.data?.code);
        
        // Test 3: List rooms again to see if the new room appears
        setTimeout(() => {
          console.log('3. Re-testing list rooms after creation...');
          fetch(`${API_BASE}/api/v1/rooms`, { headers })
            .then(res => res.json())
            .then(data => {
              console.log('List rooms after creation:', data);
              if (data.success) {
                console.log('✅ Found', data.data?.rooms?.length || 0, 'rooms after creation');
              }
            });
        }, 1000);
      } else {
        console.error('❌ Create room failed:', data.message);
      }
    })
    .catch(err => console.error('❌ Create room error:', err));
}