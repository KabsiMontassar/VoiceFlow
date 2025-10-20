// Socket Connection Test Script
// Run this in your browser console on the VoiceFlow room page

console.log('🔌 Testing Socket Connection...');

// Get the auth token from localStorage
const token = localStorage.getItem('authToken') || localStorage.getItem('accessToken');
console.log('Auth token:', token ? '✅ Found' : '❌ Not found');

if (!token) {
  console.error('❌ No auth token found. Please login first.');
} else {
  const API_BASE = 'http://localhost:3000';
  
  // Get room ID from URL
  const roomId = window.location.pathname.split('/').pop();
  console.log('Current room ID:', roomId);

  if (roomId && roomId !== 'room') {
    console.log('📡 Connecting to Socket.IO...');
    
    // Test Socket.IO connection with script tag
    if (typeof io === 'undefined') {
      // Add socket.io script if not available
      const script = document.createElement('script');
      script.src = `${API_BASE}/socket.io/socket.io.js`;
      script.onload = () => {
        console.log('✅ Socket.IO script loaded');
        testSocketConnection();
      };
      document.head.appendChild(script);
    } else {
      testSocketConnection();
    }

    function testSocketConnection() {
      const socket = io(API_BASE, {
        auth: { token: token },
        transports: ['websocket', 'polling']
      });

      socket.on('connect', () => {
        console.log('✅ Socket connected:', socket.id);
        
        // Test room joining
        console.log('🏠 Joining room:', roomId);
        socket.emit('room:join', { roomId: roomId }, (response) => {
          console.log('Room join response:', response);
          if (response && response.success) {
            console.log('✅ Successfully joined room');
            
            // Set up message listener
            socket.on('message:received', (message) => {
              console.log('📨 Message received:', message);
            });
            
            // Test sending a message
            setTimeout(() => {
              console.log('📤 Testing message send...');
              socket.emit('message:send', {
                roomId: roomId,
                content: `Test message at ${new Date().toLocaleTimeString()}`,
                type: 'text'
              }, (response) => {
                console.log('Message send response:', response);
                if (response && response.success) {
                  console.log('✅ Message sent successfully!');
                } else {
                  console.error('❌ Message send failed:', response);
                }
              });
            }, 1000);
            
          } else {
            console.error('❌ Failed to join room:', response);
          }
        });
      });

      socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
      });

      socket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
      });

      socket.on('error', (error) => {
        console.error('❌ Socket error:', error);
      });

      // Test disconnection after 10 seconds
      setTimeout(() => {
        console.log('🔌 Disconnecting socket...');
        socket.disconnect();
      }, 10000);
    }
  } else {
    console.error('❌ Could not determine room ID from URL');
  }
}