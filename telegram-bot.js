const TelegramBot = require('node-telegram-bot-api');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { ethers } = require('ethers');
const { AptosClient, AptosAccount } = require('aptos');
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const { getHelpText } = require('./helpers/help');
const { getPriceData, formatPriceData } = require('./helpers/priceService');
require('dotenv').config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Express app for wallet connection callbacks
const app = express();
app.use(express.json());
app.use(express.static('public'));

// Initialize providers
const ethProvider = new ethers.JsonRpcProvider(process.env.ETH_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID');
const aptosClient = new AptosClient(process.env.APTOS_NODE_URL || 'https://fullnode.mainnet.aptoslabs.com');

// Local storage file path
const USER_DATA_FILE = path.join(__dirname, 'users_data.json');

// Load user data from file
function loadUserData() {
  try {
    if (fs.existsSync(USER_DATA_FILE)) {
      const data = fs.readFileSync(USER_DATA_FILE, 'utf8');
      return new Map(JSON.parse(data));
    }
  } catch (error) {
    console.error('Error loading user data:', error);
  }
  return new Map();
}

// Save user data to file
function saveUserData() {
  try {
    const data = JSON.stringify(Array.from(users.entries()), null, 2);
    fs.writeFileSync(USER_DATA_FILE, data, 'utf8');
  } catch (error) {
    console.error('Error saving user data:', error);
  }
}

// User data storage
const users = loadUserData();

// Connection state management
const connectionStates = new Map();
const pendingConnections = new Map();

// Enhanced AI prompt for understanding all commands
const COMMAND_PROMPT = `You are an intelligent crypto trading assistant. Analyze user messages and return JSON with the appropriate action and parameters.

Available actions:
- "portfolio" or "balance": Show user's wallet balances and portfolio
- "trade" or "buy" or "swap": Execute trading operations
- "price" or "check": Get current price information
- "alert" or "notify": Set price alerts
- "help": Show help information
- "connect": Connect wallets
- "disconnect": Disconnect wallets
- "stop": Stop all active trades/alerts
- "unknown": Command not understood

Response format:
{
  "action": "portfolio|trade|price|alert|help|connect|disconnect|stop|unknown",
  "intent": "brief description of what user wants",
  "tokens": ["ETH", "APT", "BTC"] // tokens mentioned,
  "amount": "number if specified",
  "fromToken": "source token",
  "toToken": "destination token",
  "priceTarget": "price target if mentioned",
  "confidence": "0-1 confidence score"
}

Examples:
"show my portfolio" -> {"action":"portfolio","intent":"show portfolio","confidence":0.95}
"i want to see my balance" -> {"action":"portfolio","intent":"check balance","confidence":0.9}
"what's the price of ETH" -> {"action":"price","intent":"check ETH price","tokens":["ETH"],"confidence":0.95}
"buy 100 USDC of APT" -> {"action":"trade","intent":"buy APT","fromToken":"USDC","toToken":"APT","amount":100,"confidence":0.95}
"alert when BTC hits 50000" -> {"action":"alert","intent":"price alert","tokens":["BTC"],"priceTarget":50000,"confidence":0.9}
"help me" -> {"action":"help","intent":"need help","confidence":1.0}

User message: `;

// Generate connection session
function generateConnectionSession(userId, walletType) {
  const sessionId = crypto.randomUUID();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  pendingConnections.set(sessionId, {
    userId,
    walletType,
    expiresAt,
    connected: false
  });
  
  return sessionId;
}

// Create wallet connection keyboard with redirect links
function createWalletSelectionKeyboard(userId) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🦊 Connect MetaMask', url: `${baseUrl}/connect/metamask?userId=${userId}` },
        ],
        [
          { text: '🅿️ Connect Petra Wallet', url: `${baseUrl}/connect/petra?userId=${userId}` }
        ],
        [
          { text: '🔗 Connect Both Wallets', callback_data: 'connect_both' }
        ],
        [
          { text: '❌ Cancel', callback_data: 'cancel_connection' }
        ]
      ]
    }
  };
}

// Web routes for wallet connections
app.get('/connect/metamask', (req, res) => {
  const userId = req.query.userId;
  const sessionId = generateConnectionSession(userId, 'metamask');
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Connect MetaMask</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { font-family: Arial, sans-serif; max-width: 400px; margin: 50px auto; padding: 20px; text-align: center; }
            .btn { background: #f6851b; color: white; padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; margin: 10px; }
            .btn:hover { background: #e2761b; }
            .status { margin: 20px 0; padding: 10px; border-radius: 8px; }
            .success { background: #d4edda; color: #155724; }
            .error { background: #f8d7da; color: #721c24; }
        </style>
    </head>
    <body>
        <h2>🦊 Connect MetaMask</h2>
        <p>Click the button below to connect your MetaMask wallet to the trading bot.</p>
        <button class="btn" onclick="connectMetaMask()">Connect MetaMask</button>
        <div id="status"></div>
        
        <script>
            const sessionId = '${sessionId}';
            const userId = '${userId}';
            
            async function connectMetaMask() {
                const statusDiv = document.getElementById('status');
                
                try {
                    if (typeof window.ethereum === 'undefined') {
                        statusDiv.innerHTML = '<div class="error">MetaMask not detected. Please install MetaMask extension.</div>';
                        return;
                    }
                    
                    statusDiv.innerHTML = '<div>Connecting to MetaMask...</div>';
                    
                    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                    const account = accounts[0];
                    
                    // Send connection data to backend
                    const response = await fetch('/api/connect/confirm', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            sessionId,
                            userId,
                            walletType: 'metamask',
                            address: account
                        })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        statusDiv.innerHTML = '<div class="success">✅ MetaMask connected successfully! You can now close this window and return to Telegram.</div>';
                    } else {
                        statusDiv.innerHTML = '<div class="error">❌ Connection failed: ' + result.error + '</div>';
                    }
                    
                } catch (error) {
                    statusDiv.innerHTML = '<div class="error">❌ Connection failed: ' + error.message + '</div>';
                }
            }
        </script>
    </body>
    </html>
  `);
});

app.get('/connect/petra', (req, res) => {
  const userId = req.query.userId;
  const sessionId = generateConnectionSession(userId, 'petra');
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Connect Petra Wallet</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { font-family: Arial, sans-serif; max-width: 400px; margin: 50px auto; padding: 20px; text-align: center; }
            .btn { background: #6366f1; color: white; padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; margin: 10px; }
            .btn:hover { background: #4f46e5; }
            .status { margin: 20px 0; padding: 10px; border-radius: 8px; }
            .success { background: #d4edda; color: #155724; }
            .error { background: #f8d7da; color: #721c24; }
        </style>
    </head>
    <body>
        <h2>🅿️ Connect Petra Wallet</h2>
        <p>Click the button below to connect your Petra wallet to the trading bot.</p>
        <button class="btn" onclick="connectPetra()">Connect Petra Wallet</button>
        <div id="status"></div>
        
        <script>
            const sessionId = '${sessionId}';
            const userId = '${userId}';
            
            async function connectPetra() {
                const statusDiv = document.getElementById('status');
                
                try {
                    if (typeof window.aptos === 'undefined') {
                        statusDiv.innerHTML = '<div class="error">Petra Wallet not detected. Please install Petra Wallet extension.</div>';
                        return;
                    }
                    
                    statusDiv.innerHTML = '<div>Connecting to Petra Wallet...</div>';
                    
                    const response = await window.aptos.connect();
                    const account = response.address;
                    
                    // Send connection data to backend
                    const backendResponse = await fetch('/api/connect/confirm', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            sessionId,
                            userId,
                            walletType: 'petra',
                            address: account
                        })
                    });
                    
                    const result = await backendResponse.json();
                    
                    if (result.success) {
                        statusDiv.innerHTML = '<div class="success">✅ Petra Wallet connected successfully! You can now close this window and return to Telegram.</div>';
                    } else {
                        statusDiv.innerHTML = '<div class="error">❌ Connection failed: ' + result.error + '</div>';
                    }
                    
                } catch (error) {
                    statusDiv.innerHTML = '<div class="error">❌ Connection failed: ' + error.message + '</div>';
                }
            }
        </script>
    </body>
    </html>
  `);
});

// API endpoint to confirm wallet connection
app.post('/api/connect/confirm', async (req, res) => {
  const { sessionId, userId, walletType, address } = req.body;
  
  try {
    const connection = pendingConnections.get(sessionId);
    
    if (!connection) {
      return res.json({ success: false, error: 'Invalid session' });
    }
    
    if (connection.expiresAt < Date.now()) {
      pendingConnections.delete(sessionId);
      return res.json({ success: false, error: 'Session expired' });
    }
    
    if (connection.userId !== userId) {
      return res.json({ success: false, error: 'Invalid user' });
    }
    
    // Update user data
    const user = users.get(userId) || { id: userId, wallets: {}, alerts: [] };
    
    if (walletType === 'metamask') {
      user.wallets.ethereum = { address, connected: true };
      bot.sendMessage(userId, `✅ MetaMask connected successfully!\n📍 Address: ${address.slice(0,6)}...${address.slice(-4)}`);
    } else if (walletType === 'petra') {
      user.wallets.aptos = { address, connected: true };
      bot.sendMessage(userId, `✅ Petra Wallet connected successfully!\n📍 Address: ${address.slice(0,6)}...${address.slice(-4)}`);
    }
    
    users.set(userId, user);
    saveUserData();
    
    connection.connected = true;
    pendingConnections.delete(sessionId);
    
    res.json({ success: true });
    
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Parse user message with enhanced Gemini AI
async function parseCommand(message) {
  try {
    const result = await model.generateContent(COMMAND_PROMPT + message);
    const response = result.response.text();
    const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanResponse);
  } catch (error) {
    console.error('AI parsing error:', error);
    return { action: 'unknown', confidence: 0, intent: 'failed to parse' };
  }
}

// Execute command based on AI parsing
async function executeCommand(userId, command, originalMessage) {
  const user = users.get(userId);
  
  switch (command.action) {
    case 'portfolio':
    case 'balance':
      return await getPortfolio(user);
    
    case 'price':
      return await getPriceInformation(command.tokens);
    
    case 'trade':
    case 'swap':
      if (!user?.wallets?.ethereum && !user?.wallets?.aptos) {
        return 'Please connect your wallets first using /connect';
      }
      return await performTrade(user, command);
    
    case 'alert':
      return await setPriceAlert(user, command);
    
    case 'help':
      return getHelpText();
    
    case 'connect':
      return 'Please use /connect to connect your wallets.';
    
    case 'disconnect':
      return await disconnectWallets(user);
    
    case 'stop':
      return await stopAllActivities(user);
    
    default:
      return `I didn't understand "${originalMessage}". ${getHelpText()}`;
  }
}

// Get portfolio with combined balance from both wallets
async function getPortfolio(user) {
  if (!user?.wallets) {
    return 'No wallets connected. Use /connect to connect your wallets first.';
  }
  
  try {
    let portfolioMsg = '📊 Your Portfolio:\n\n';
    let totalValue = 0;
    
    // Get Ethereum balances
    if (user.wallets.ethereum?.address) {
      portfolioMsg += '🟦 **Ethereum Wallet:**\n';
      
      const ethBalance = await ethProvider.getBalance(user.wallets.ethereum.address);
      const ethAmount = parseFloat(ethers.formatEther(ethBalance));
      
      // Get ETH price
      const ethPrice = await getPriceData('ethereum');
      const ethValue = ethAmount * ethPrice.current_price;
      
      portfolioMsg += `   • ETH: ${ethAmount.toFixed(4)} ($${ethValue.toFixed(2)})\n`;
      totalValue += ethValue;
      
      // Get ERC-20 tokens (simplified - would need contract calls for actual tokens)
      portfolioMsg += '\n';
    }
    
    // Get Aptos balances
    if (user.wallets.aptos?.address) {
      portfolioMsg += '🟣 **Aptos Wallet:**\n';
      
      try {
        const resources = await aptosClient.getAccountResources(user.wallets.aptos.address);
        const coinResource = resources.find(r => r.type === '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>');
        
        if (coinResource) {
          const aptAmount = parseInt(coinResource.data.coin.value) / 1e8;
          const aptPrice = await getPriceData('aptos');
          const aptValue = aptAmount * aptPrice.current_price;
          
          portfolioMsg += `   • APT: ${aptAmount.toFixed(4)} ($${aptValue.toFixed(2)})\n`;
          totalValue += aptValue;
        }
      } catch (error) {
        portfolioMsg += '   • APT: Unable to fetch balance\n';
      }
      
      portfolioMsg += '\n';
    }
    
    // Portfolio summary
    portfolioMsg += `💰 **Total Portfolio Value: $${totalValue.toFixed(2)}**\n\n`;
    
    // Active alerts
    const activeAlerts = user.alerts?.filter(a => a.active).length || 0;
    portfolioMsg += `🔔 Active Alerts: ${activeAlerts}`;
    
    return portfolioMsg;
    
  } catch (error) {
    return `❌ Error fetching portfolio: ${error.message}`;
  }
}

// Get price information for tokens
async function getPriceInformation(tokens) {
  if (!tokens || tokens.length === 0) {
    return 'Please specify which token price you want to check. Example: "What\'s the price of ETH?"';
  }
  
  try {
    let priceMsg = '💹 **Current Prices:**\n\n';
    
    for (const token of tokens) {
      const tokenId = getTokenId(token);
      if (tokenId) {
        const priceData = await getPriceData(tokenId);
        priceMsg += formatPriceData(token, priceData);
      } else {
        priceMsg += `❌ ${token}: Token not found\n`;
      }
    }
    
    return priceMsg;
    
  } catch (error) {
    return `❌ Error fetching prices: ${error.message}`;
  }
}

// Map token symbols to CoinGecko IDs
function getTokenId(symbol) {
  const tokenMap = {
    'ETH': 'ethereum',
    'BTC': 'bitcoin',
    'APT': 'aptos',
    'USDC': 'usd-coin',
    'USDT': 'tether',
    'BNB': 'binancecoin',
    'SOL': 'solana',
    'ADA': 'cardano',
    'DOT': 'polkadot',
    'MATIC': 'matic-network'
  };
  
  return tokenMap[symbol.toUpperCase()];
}

// Set price alert
async function setPriceAlert(user, command) {
  if (!user.alerts) user.alerts = [];
  
  const token = command.tokens?.[0] || 'Unknown';
  const target = command.priceTarget || 'Unknown';
  
  user.alerts.push({
    token,
    priceTarget: target,
    condition: `${token} >= $${target}`,
    active: true,
    created: new Date()
  });
  
  saveUserData();
  return `🔔 Price alert set for ${token} at $${target}`;
}

// Disconnect wallets
async function disconnectWallets(user) {
  if (user?.wallets) {
    user.wallets = {};
    saveUserData();
    return '🔌 All wallets disconnected successfully.';
  }
  return '❌ No wallets connected.';
}

// Stop all activities
async function stopAllActivities(user) {
  if (user?.alerts) {
    user.alerts.forEach(alert => alert.active = false);
  }
  saveUserData();
  return '🛑 All alerts and activities stopped.';
}

// Perform trade (placeholder - would need actual DEX integration)
async function performTrade(user, command) {
  return `🔄 Trading feature coming soon!\n\nCommand parsed:\n• From: ${command.fromToken}\n• To: ${command.toToken}\n• Amount: ${command.amount}\n\nThis would execute: ${command.intent}`;
}

// Bot command handlers
bot.onText(/\/start/, (msg) => {
  const userId = msg.from.id;
  
  if (!users.has(userId)) {
    users.set(userId, { 
      id: userId,
      username: msg.from.username,
      wallets: {},
      alerts: []
    });
    saveUserData();
  }
  
  bot.sendMessage(userId, 
    `🚀 **Welcome to Enhanced Trading Bot!**\n\n` +
    `🤖 I understand natural language commands:\n` +
    `• "Show my portfolio"\n` +
    `• "What's the price of ETH?"\n` +
    `• "Buy 100 USDC of APT"\n` +
    `• "Set alert when BTC hits 50000"\n\n` +
    `🔗 Connect your wallets with /connect\n` +
    `❓ Need help? Just ask "help" or use /help`
  );
});

bot.onText(/\/connect/, (msg) => {
  const userId = msg.from.id;
  
  if (!users.has(userId)) {
    users.set(userId, { id: userId, wallets: {}, alerts: [] });
  }
  
  bot.sendMessage(userId, 
    `🔗 **Connect Your Wallets**\n\n` +
    `Click the buttons below to connect your wallets securely through your browser. No private keys needed!`,
    createWalletSelectionKeyboard(userId)
  );
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.from.id, getHelpText());
});

// Handle callback queries
bot.on('callback_query', async (callbackQuery) => {
  const userId = callbackQuery.from.id;
  const data = callbackQuery.data;
  
  await bot.answerCallbackQuery(callbackQuery.id);
  
  if (data === 'connect_both') {
    bot.sendMessage(userId, 
      `🔗 **Connect Both Wallets**\n\n` +
      `Please connect your wallets one by one using the buttons below:`,
      createWalletSelectionKeyboard(userId)
    );
  } else if (data === 'cancel_connection') {
    bot.sendMessage(userId, '❌ Connection cancelled.');
  }
});

// Handle all messages with AI processing
bot.on('message', async (msg) => {
  if (msg.text?.startsWith('/')) return; // Skip commands
  
  const userId = msg.from.id;
  const user = users.get(userId);
  
  if (!user) {
    bot.sendMessage(userId, 'Please start with /start first');
    return;
  }
  
  try {
    // Show processing message
    const processingMsg = await bot.sendMessage(userId, '🤖 Processing your request...');
    
    // Parse command with AI
    const command = await parseCommand(msg.text);
    
    // Delete processing message
    bot.deleteMessage(userId, processingMsg.message_id);
    
    // Execute command
    const result = await executeCommand(userId, command, msg.text);
    bot.sendMessage(userId, result, { parse_mode: 'Markdown' });
    
  } catch (error) {
    bot.sendMessage(userId, `❌ Error: ${error.message}`);
  }
});

// Price monitoring for alerts
setInterval(async () => {
  for (const [userId, user] of users.entries()) {
    if (!user.alerts?.length) continue;
    
    for (const alert of user.alerts.filter(a => a.active)) {
      try {
        const tokenId = getTokenId(alert.token);
        if (tokenId) {
          const priceData = await getPriceData(tokenId);
          
          if (priceData.current_price >= alert.priceTarget) {
            bot.sendMessage(userId, 
              `🔔 **PRICE ALERT!**\n\n` +
              `${alert.token} has reached $${priceData.current_price.toFixed(2)}\n` +
              `Target: $${alert.priceTarget}\n` +
              `Change (24h): ${priceData.price_change_percentage_24h.toFixed(2)}%`
            );
            alert.active = false;
          }
        }
      } catch (error) {
        console.error('Price monitoring error:', error);
      }
    }
  }
  
  saveUserData();
}, 300000); // Check every 5 minutes

// Cleanup expired connections
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, connection] of pendingConnections.entries()) {
    if (connection.expiresAt < now) {
      pendingConnections.delete(sessionId);
    }
  }
}, 300000); // Cleanup every 5 minutes

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('💾 Saving user data before shutdown...');
  saveUserData();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('💾 Saving user data before shutdown...');
  saveUserData();
  process.exit(0);  
});

// Start Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Web server running on port ${PORT}`);
  console.log('🤖 Enhanced Telegram Trading Bot started with AI processing!');
});
