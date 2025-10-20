// Test script to verify messaging functionality
// Run this in your browser console on the VoiceFlow room page

console.log('Testing VoiceFlow Messaging...');

// Get the auth token from localStorage
const token = localStorage.getItem('authToken') || localStorage.getItem('accessToken');
console.log('Auth token:', token ? 'Found' : 'Not found');

if (!token) {
  console.error('No auth token found. Please login first.');
} else {
  const API_BASE = 'http://localhost:3000';
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Get room ID from URL (assuming we're on room page)
  const roomId = window.location.pathname.split('/').pop();
  console.log('Current room ID:', roomId);

  if (roomId && roomId !== 'room') {
    // Test 1: Send a message via API
    console.log('1. Testing send message via API...');
    fetch(`${API_BASE}/api/v1/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        roomId: roomId,
        content: `Test message from API at ${new Date().toLocaleTimeString()}`,
        type: 'text'
      })
    })
      .then(res => res.json())
      .then(data => {
        console.log('Send message API response:', data);
        if (data.success) {
          console.log('✅ Message sent via API. Message ID:', data.data?.id);
          console.log('Message data:', data.data);
        } else {
          console.error('❌ Send message failed:', data.message);
        }
      })
      .catch(err => console.error('❌ Send message error:', err));

    // Test 2: Get room messages
    setTimeout(() => {
      console.log('2. Testing get room messages...');
      fetch(`${API_BASE}/api/v1/messages/${roomId}`, { headers })
        .then(res => res.json())
        .then(data => {
          console.log('Get messages response:', data);
          if (data.success) {
            console.log('✅ Found', data.data?.data?.length || 0, 'messages');
            if (data.data?.data?.length > 0) {
              console.log('Latest message:', data.data.data[data.data.data.length - 1]);
            }
          } else {
            console.error('❌ Get messages failed:', data.message);
          }
        })
        .catch(err => console.error('❌ Get messages error:', err));
    }, 1000);

    // Test 3: Socket.IO connection test
    setTimeout(() => {
      console.log('3. Testing Socket.IO connection...');
      if (typeof io !== 'undefined') {
        const socket = io(API_BASE, {
          auth: { token: token }
        });

        socket.on('connect', () => {
          console.log('✅ Socket connected:', socket.id);
          
          // Join room
          socket.emit('room:join', { roomId: roomId }, (response) => {
            console.log('Join room response:', response);
          });

          // Test sending message via socket
          setTimeout(() => {
            console.log('4. Testing send message via socket...');
            socket.emit('message:send', {
              roomId: roomId,
              content: `Test message from Socket at ${new Date().toLocaleTimeString()}`,
              type: 'text'
            }, (response) => {
              console.log('Socket send message response:', response);
            });
          }, 1000);

          // Listen for incoming messages
          socket.on('message:received', (message) => {
            console.log('✅ Message received via socket:', message);
          });
        });

        socket.on('connect_error', (error) => {
          console.error('❌ Socket connection error:', error);
        });

        socket.on('error', (error) => {
          console.error('❌ Socket error:', error);
        });
      } else {
        console.error('❌ Socket.IO not available. Please include socket.io-client script.');
      }
    }, 2000);
  } else {
    console.error('❌ Could not determine room ID from URL');
  }
}