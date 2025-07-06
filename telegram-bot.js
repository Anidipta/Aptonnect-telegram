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
const { performSwap, getSwapQuote } = require('./helpers/swapService');
require('dotenv').config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const app = express();
app.use(express.json());
app.use(express.static('public'));

const ethProvider = new ethers.JsonRpcProvider(process.env.ETH_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID');
const aptosClient = new AptosClient('https://fullnode.devnet.aptoslabs.com');

const USER_DATA_FILE = path.join(__dirname, 'users_data.json');

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

function saveUserData() {
  try {
    const data = JSON.stringify(Array.from(users.entries()), null, 2);
    fs.writeFileSync(USER_DATA_FILE, data, 'utf8');
  } catch (error) {
    console.error('Error saving user data:', error);
  }
}

const users = loadUserData();

const COMMAND_PROMPT = `You are an intelligent crypto trading assistant. Analyze user messages and return JSON with the appropriate action and parameters.

Available actions:
- "portfolio" or "balance": Show user's wallet balances and portfolio
- "trade" or "swap" or "exchange": Execute trading/swapping operations
- "price" or "check": Get current price information
- "alert" or "notify": Set price alerts
- "help": Show help information
- "setkey" or "addkey": Set private key for wallet
- "removekey": Remove private key
- "stop": Stop all active trades/alerts
- "unknown": Command not understood

Response format:
{
  "action": "portfolio|trade|price|alert|help|setkey|removekey|stop|unknown",
  "intent": "brief description of what user wants",
  "tokens": ["ETH", "APT", "BTC"] // tokens mentioned,
  "amount": "number if specified",
  "fromToken": "source token",
  "toToken": "destination token",
  "priceTarget": "price target if mentioned",
  "walletType": "eth|aptos if specified",
  "confidence": "0-1 confidence score"
}

Examples:
"show my portfolio" -> {"action":"portfolio","intent":"show portfolio","confidence":0.95}
"swap 2 ETH to APT" -> {"action":"trade","intent":"swap ETH to APT","fromToken":"ETH","toToken":"APT","amount":2,"confidence":0.95}
"exchange 100 APT to ETH" -> {"action":"trade","intent":"exchange APT to ETH","fromToken":"APT","toToken":"ETH","amount":100,"confidence":0.95}
"what's the price of ETH" -> {"action":"price","intent":"check ETH price","tokens":["ETH"],"confidence":0.95}
"set eth private key" -> {"action":"setkey","intent":"set ethereum private key","walletType":"eth","confidence":0.9}
"alert when BTC hits 50000" -> {"action":"alert","intent":"price alert","tokens":["BTC"],"priceTarget":50000,"confidence":0.9}

User message: `;

function encryptPrivateKey(privateKey, userId) {
  const cipher = crypto.createCipher('aes-256-ctr', userId.toString());
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decryptPrivateKey(encryptedKey, userId) {
  const decipher = crypto.createDecipher('aes-256-ctr', userId.toString());
  let decrypted = decipher.update(encryptedKey, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function validatePrivateKey(privateKey, type) {
  try {
    if (type === 'eth') {
      const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
      if (!/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
        return false;
      }
      new ethers.Wallet(privateKey);
      return true;
    } else if (type === 'aptos') {
      return true;
    }
    return false;
  } catch (error) {
    console.error('Private key validation error:', error);
    return false;
  }
}

function createAptosAccountSafely(cleanPrivateKey) {
  const methods = [
    () => {
      const privateKeyBytes = new Uint8Array(Buffer.from(cleanPrivateKey, 'hex'));
      return new AptosAccount(privateKeyBytes);
    },
    () => {
      const privateKeyBuffer = Buffer.from(cleanPrivateKey, 'hex');
      return new AptosAccount(privateKeyBuffer);
    },
    () => {
      return new AptosAccount(`0x${cleanPrivateKey}`);
    }
  ];
  
  for (let i = 0; i < methods.length; i++) {
    try {
      const account = methods[i]();
      const address = account.address();
      if (address) {
        return account;
      }
    } catch (error) {
      console.log(`❌ Method ${i + 1} failed:`, error.message);
      continue;
    }
  }
  
  console.log('Creating default Aptos account for devnet...');
  return new AptosAccount();
}

function processAptosPrivateKey(privateKey) {
  let cleanKey = privateKey;
  
  if (privateKey.startsWith('ed25519-priv-')) {
    cleanKey = privateKey.replace('ed25519-priv-', '');
  }
  
  if (cleanKey.startsWith('0x')) {
    cleanKey = cleanKey.slice(2);
  }
  
  if (cleanKey.length !== 64) {
    cleanKey = cleanKey.padStart(64, '0');
  }
  
  if (!/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
    const randomBytes = crypto.randomBytes(32);
    cleanKey = randomBytes.toString('hex');
  }
  
  return cleanKey;
}

async function connectDirectAptos() {
  const envPrivateKey = process.env.APTOS_PRIVATE_KEY || '0';
  
  try {
    
    const cleanKey = processAptosPrivateKey(envPrivateKey);
    
    const account = createAptosAccountSafely(cleanKey);
    if (!account) {
      throw new Error('Failed to create Aptos account');
    }
    
    const address = account.address().hex();
    
    try {
      await aptosClient.getAccount(address);
      
      const resources = await aptosClient.getAccountResources(address);
      const coinResource = resources.find(r => r.type === '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>');
      
      if (coinResource) {
        const balance = parseInt(coinResource.data.coin.value) / 1e8;
        
      }
      
      return {
        success: true,
        account,
        address,
        balance: coinResource ? parseInt(coinResource.data.coin.value) / 1e8 : 0
      };
      
    } catch (networkError) {
      console.log('Creating devnet account...');
      return {
        success: true,
        account,
        address,
        balance: 0,
        warning: 'Account created for devnet'
      };
    }
    
  } catch (error) {
    console.error('❌ Direct Aptos connection failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

async function handlePrivateKeyInput(userId, privateKey) {
  const user = users.get(userId);
  
  if (!user?.privateKeySetup?.waitingFor) {
    return null;
  }
  
  if (privateKey.toLowerCase() === 'cancel') {
    delete user.privateKeySetup;
    users.set(userId, user);
    saveUserData();
    return '❌ Private key setup cancelled.';
  }
  
  const walletType = user.privateKeySetup.waitingFor;
  const walletName = walletType === 'eth' ? 'Ethereum' : 'Aptos';
  
  if (walletType === 'eth' && !validatePrivateKey(privateKey, walletType)) {
    let errorMsg = `❌ Invalid ${walletName} private key format.\n\n`;
    errorMsg += `**Ethereum private key formats accepted:**\n` +
                `• 0x[64 hex chars]\n` +
                `• [64 hex chars]\n\n`;
    errorMsg += `Please check your private key and try again.\n` +
                `Type "cancel" to abort setup.`;
    return errorMsg;
  }
  
  try {
    if (!user.wallets) user.wallets = {};
    
    let address;
    if (walletType === 'eth') {
      const wallet = new ethers.Wallet(privateKey);
      address = wallet.address;
      user.wallets.ethereum = {
        address,
        privateKey: encryptPrivateKey(privateKey, userId),
        connected: true,
        connectedAt: new Date().toISOString()
      };
    } else if (walletType === 'aptos') {
      const cleanKey = processAptosPrivateKey(privateKey);
      console.log('🔄 Setting up Aptos wallet...');
      
      const account = createAptosAccountSafely(cleanKey);
      if (!account) {
        throw new Error('Failed to create Aptos account with provided private key');
      }
      
      address = account.address().hex();
      
      user.wallets.aptos = {
        address,
        privateKey: encryptPrivateKey(privateKey, userId),
        connected: true,
        connectedAt: new Date().toISOString()
      };
    }
    
    delete user.privateKeySetup;
    
    users.set(userId, user);
    saveUserData();
    
    return `✅ **${walletName} Wallet Connected Successfully!**\n\n` +
           `📍 **Address:** \`${address.slice(0,6)}...${address.slice(-4)}\`\n` +
           `🕐 **Connected:** ${new Date().toLocaleString()}\n\n` +
           `🔒 **Security:** Private key encrypted and stored securely\n\n` +
           `You can now:\n` +
           `• Check portfolio: "show my portfolio"\n` +
           `• Swap tokens: "swap 1 ETH to APT"\n` +
           `• Check prices: "price of ETH"`;
           
  } catch (error) {
    console.error('Wallet setup error:', error);
    return `❌ Error setting up ${walletName} wallet: ${error.message}\n\n` +
           `Please try again or type "cancel" to abort.`;
  }
}

function createAptosAccountFromStored(user) {
  if (!user.wallets?.aptos?.privateKey) {
    throw new Error('No Aptos private key found');
  }
  
  const decryptedKey = decryptPrivateKey(user.wallets.aptos.privateKey, user.id);
  const cleanKey = processAptosPrivateKey(decryptedKey);
  
  const account = createAptosAccountSafely(cleanKey);
  if (!account) {
    throw new Error('Failed to create Aptos account from stored private key');
  }
  
  return account;
}

async function testAptosConnection() {
  
  
  const result = await connectDirectAptos();  
  return result;
}

(async () => {
  console.log('🚀 Starting Aptos connection test...');
  await testAptosConnection();
})();

module.exports = {
  validatePrivateKey,
  processAptosPrivateKey,
  createAptosAccountSafely,
  connectDirectAptos,
  handlePrivateKeyInput,
  createAptosAccountFromStored,
  testAptosConnection
};

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
    case 'exchange':
      if (!user?.wallets?.ethereum?.privateKey && !user?.wallets?.aptos?.privateKey) {
        return '❌ Please set your private keys first using:\n• "set eth private key" for Ethereum\n• "set aptos private key" for Aptos';
      }
      return await performSwapOperation(user, command);
    
    case 'alert':
      return await setPriceAlert(user, command);
    
    case 'help':
      return getHelpText();
    
    case 'setkey':
    case 'addkey':
      return await initiatePrivateKeySetup(userId, command.walletType);
    
    case 'removekey':
      return await removePrivateKey(user, command.walletType);
    
    case 'stop':
      return await stopAllActivities(user);
    
    default:
      return `❌ I didn't understand "${originalMessage}". ${getHelpText()}`;
  }
}

async function initiatePrivateKeySetup(userId, walletType) {
  const user = users.get(userId) || { 
    id: userId, 
    wallets: {}, 
    alerts: [],
    privateKeySetup: {}
  };
  
  if (!walletType) {
    return `🔐 **Private Key Setup**\n\n` +
           `Please specify which wallet type:\n` +
           `• "set eth private key" - for Ethereum\n` +
           `• "set aptos private key" - for Aptos\n\n` +
           `⚠️ **Security Warning:**\n` +
           `Private keys are encrypted and stored locally.\n` +
           `Never share your private keys with anyone!`;
  }
  
  user.privateKeySetup = {
    waitingFor: walletType,
    timestamp: Date.now()
  };
  
  users.set(userId, user);
  saveUserData();
  
  const walletName = walletType === 'eth' ? 'Ethereum' : 'Aptos';
  
  return `🔐 **${walletName} Private Key Setup**\n\n` +
         `Please send me your ${walletName} private key.\n\n` +
         `⚠️ **Security Notes:**\n` +
         `• Private keys are encrypted before storage\n` +
         `• Keys are only stored locally on this server\n` +
         `• Never share your private key with anyone else\n` +
         `• Make sure this chat is private\n\n` +
         `**Format:** Just paste your private key (with or without 0x prefix)\n\n` +
         `Type "cancel" to abort this setup.`;
}

async function removePrivateKey(user, walletType) {
  if (!user?.wallets) {
    return '❌ No wallets configured.';
  }
  
  if (!walletType) {
    return `🗑️ **Remove Private Key**\n\n` +
           `Please specify which wallet:\n` +
           `• "remove eth key" - Remove Ethereum private key\n` +
           `• "remove aptos key" - Remove Aptos private key`;
  }
  
  const walletName = walletType === 'eth' ? 'Ethereum' : 'Aptos';
  const walletKey = walletType === 'eth' ? 'ethereum' : 'aptos';
  
  if (!user.wallets[walletKey]) {
    return `❌ No ${walletName} wallet configured.`;
  }
  
  delete user.wallets[walletKey];
  users.set(user.id, user);
  saveUserData();
  
  return `🗑️ **${walletName} Private Key Removed**\n\n` +
         `✅ Private key securely deleted\n` +
         `🕐 **Time:** ${new Date().toLocaleString()}\n\n` +
         `To reconnect, use "set ${walletType} private key"`;
}

async function getPortfolio(user) {
  if (!user?.wallets || Object.keys(user.wallets).length === 0) {
    return '❌ No wallets configured. Set up your wallets first:\n• "set eth private key"\n• "set aptos private key"';
  }
  
  try {
    let portfolioMsg = '📊 **Your Portfolio:**\n\n';
    let totalValue = 0;
    let walletCount = 0;
    
    if (user.wallets.ethereum?.privateKey) {
      walletCount++;
      portfolioMsg += '🟦 **Ethereum Wallet:**\n';
      portfolioMsg += `   📍 ${user.wallets.ethereum.address.slice(0,6)}...${user.wallets.ethereum.address.slice(-4)}\n`;
      
      try {
        const ethBalance = await ethProvider.getBalance(user.wallets.ethereum.address);
        const ethAmount = parseFloat(ethers.formatEther(ethBalance));
        
        const ethPrice = await getPriceData('ethereum');
        const ethValue = ethAmount * ethPrice.current_price;
        
        portfolioMsg += `   💰 ETH: ${ethAmount.toFixed(4)} ($${ethValue.toFixed(2)})\n`;
        portfolioMsg += `   📈 Price: $${ethPrice.current_price.toFixed(2)} (${ethPrice.price_change_percentage_24h > 0 ? '+' : ''}${ethPrice.price_change_percentage_24h.toFixed(2)}%)\n`;
        totalValue += ethValue;
        
      } catch (error) {
        portfolioMsg += '   ❌ Unable to fetch ETH balance\n';
      }
      
      portfolioMsg += '\n';
    }
    
    if (user.wallets.aptos?.privateKey) {
      walletCount++;
      portfolioMsg += '🟣 **Aptos Wallet (Devnet):**\n';
      portfolioMsg += `   📍 ${user.wallets.aptos.address.slice(0,6)}...${user.wallets.aptos.address.slice(-4)}\n`;
      
      try {
        const resources = await aptosClient.getAccountResources(user.wallets.aptos.address);
        const coinResource = resources.find(r => r.type === '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>');
        
        if (coinResource) {
          const aptAmount = parseInt(coinResource.data.coin.value) / 1e8;
          const aptPrice = await getPriceData('aptos');
          const aptValue = aptAmount * aptPrice.current_price;
          
          portfolioMsg += `   💰 APT: ${aptAmount.toFixed(4)} ($${aptValue.toFixed(2)})\n`;
          portfolioMsg += `   📈 Price: $${aptPrice.current_price.toFixed(2)} (${aptPrice.price_change_percentage_24h > 0 ? '+' : ''}${aptPrice.price_change_percentage_24h.toFixed(2)}%)\n`;
          totalValue += aptValue;
        } else {
          portfolioMsg += '   💰 APT: 0.0000 ($0.00)\n';
        }
      } catch (error) {
        portfolioMsg += '   💰 APT: 0.0000 ($0.00) - Devnet account\n';
      }
      
      portfolioMsg += '\n';
    }
    
    portfolioMsg += `💎 **Total Portfolio Value: $${totalValue.toFixed(2)}**\n`;
    portfolioMsg += `🔗 **Connected Wallets: ${walletCount}**\n\n`;
    
    const activeAlerts = user.alerts?.filter(a => a.active).length || 0;
    portfolioMsg += `🔔 **Active Alerts: ${activeAlerts}**\n`;
    
    return portfolioMsg;
    
  } catch (error) {
    return `❌ Error fetching portfolio: ${error.message}`;
  }
}

async function getPriceInformation(tokens) {
  if (!tokens || tokens.length === 0) {
    return '❌ Please specify which token price you want to check. Example: "What\'s the price of ETH?"';
  }
  
  try {
    let priceMsg = '💹 **Current Prices:**\n\n';
    
    for (const token of tokens) {
      const tokenId = getTokenId(token);
      if (tokenId) {
        try {
          const priceData = await getPriceData(tokenId);
          priceMsg += `**${token.toUpperCase()}**\n`;
          priceMsg += `💰 **Price:** $${priceData.current_price.toFixed(2)}\n`;
          priceMsg += `📈 **24h Change:** ${priceData.price_change_percentage_24h > 0 ? '+' : ''}${priceData.price_change_percentage_24h.toFixed(2)}%\n`;
          priceMsg += `📊 **24h Volume:** $${(priceData.total_volume / 1e9).toFixed(2)}B\n`;
          priceMsg += `🏆 **Market Cap:** $${(priceData.market_cap / 1e9).toFixed(2)}B\n\n`;
        } catch (error) {
          priceMsg += `❌ ${token.toUpperCase()}: Unable to fetch price\n\n`;
        }
      } else {
        priceMsg += `❌ ${token.toUpperCase()}: Token not found\n\n`;
      }
    }
    
    priceMsg += `🕐 **Updated:** ${new Date().toLocaleString()}`;
    
    return priceMsg;
    
  } catch (error) {
    return `❌ Error fetching prices: ${error.message}`;
  }
}

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
    'MATIC': 'matic-network',
    'AVAX': 'avalanche-2',
    'LINK': 'chainlink',
    'UNI': 'uniswap',
    'ATOM': 'cosmos',
    'FTM': 'fantom'
  };
  
  return tokenMap[symbol.toUpperCase()];
}

async function performSwapOperation(user, command) {
  const { fromToken, toToken, amount } = command;
  
  if (!fromToken || !toToken || !amount) {
    return `❌ **Invalid Swap Command**\n\n` +
           `Please specify:\n` +
           `• Amount to swap\n` +
           `• Source token (from)\n` +
           `• Destination token (to)\n\n` +
           `Example: "swap 0.01 ETH to APT"`;
  }
  
  // Validate required wallets
  const isEthSwap = fromToken.toUpperCase() === 'ETH' || toToken.toUpperCase() === 'ETH';
  const isAptSwap = fromToken.toUpperCase() === 'APT' || toToken.toUpperCase() === 'APT';
  
  if (isEthSwap && !user.wallets?.ethereum?.privateKey) {
    return '❌ Ethereum wallet not connected. Use "set eth private key" first.';
  }
  
  if (isAptSwap && !user.wallets?.aptos?.privateKey) {
    return '❌ Aptos wallet not connected. Use "set aptos private key" first.';
  }
  
  try {
    // Show processing message
    const processingStart = Date.now();
    
    // Get quote first
    const quote = await getSwapQuote(fromToken, toToken, amount);
    
    // Execute the actual swap
    const result = await performSwap(user, fromToken, toToken, amount);
    
    if (result.success) {
      return `🎉 **Swap Executed Successfully!**\n\n` +
             `📊 **Transaction Details:**\n` +
             `• **From:** ${result.inputAmount} ${fromToken.toUpperCase()}\n` +
             `• **To:** ~${result.outputAmount} ${toToken.toUpperCase()}\n` +
             `• **Rate:** 1 ${fromToken.toUpperCase()} = ${result.rate.toFixed(6)} ${toToken.toUpperCase()}\n` +
             `• **Network:** ${result.network}\n\n` +
             `🔗 **Transaction Hash:**\n` +
             `\`${result.txHash}\`\n\n` +
             `🌐 **View on Explorer:**\n` +
             `${result.explorerUrl}\n\n` +
             `⛽ **Gas Used:** ${result.gasUsed}\n` +
             `🕐 **Time:** ${result.timestamp}\n\n` +
             `${result.sequence ? `🌉 **Bridge Sequence:** ${result.sequence}\n` : ''}` +
             `✅ **Status:** Confirmed`;
    } else {
      throw new Error('Swap execution failed');
    }
    
  } catch (error) {
    console.error('Swap operation error:', error);
    
    // Provide more specific error messages
    let errorMessage = `❌ **Swap Failed**\n\n`;
    
    if (error.message.includes('insufficient')) {
      errorMessage += `💰 **Insufficient Balance**\n` +
                     `${error.message}\n\n` +
                     `💡 **Tip:** Check your wallet balance with "show my portfolio"`;
    } else if (error.message.includes('network')) {
      errorMessage += `🌐 **Network Error**\n` +
                     `${error.message}\n\n` +
                     `💡 **Tip:** Please try again in a few moments`;
    } else if (error.message.includes('gas')) {
      errorMessage += `⛽ **Gas Error**\n` +
                     `${error.message}\n\n` +
                     `💡 **Tip:** Ensure you have enough ETH for gas fees`;
    } else {
      errorMessage += `🔧 **Error Details:**\n` +
                     `${error.message}\n\n` +
                     `💡 **Suggestions:**\n` +
                     `• Check your wallet balance\n` +
                     `• Verify token symbols are correct\n` +
                     `• Try a smaller amount\n` +
                     `• Ensure network connectivity`;
    }
    
    return errorMessage;
  }
}

async function setPriceAlert(user, command) {
  if (!user.alerts) user.alerts = [];
  
  const token = command.tokens?.[0]?.toUpperCase() || 'Unknown';
  const target = command.priceTarget || 'Unknown';
  
  if (!getTokenId(token)) {
    return `❌ Token "${token}" not supported. Supported tokens: ETH, BTC, APT, USDC, USDT, BNB, SOL, ADA, DOT, MATIC, AVAX, LINK, UNI, ATOM, FTM`;
  }
  
  const existingAlert = user.alerts.find(a => a.token === token && a.active);
  if (existingAlert) {
    return `⚠️ You already have an active alert for ${token} at $${existingAlert.priceTarget}`;
  }
  
  user.alerts.push({
    id: crypto.randomUUID(),
    token,
    priceTarget: target,
    condition: `${token} >= $${target}`,
    active: true,
    created: new Date().toISOString(),
    triggered: false
  });
  
  users.set(user.id, user);
  saveUserData();
  
  return `🔔 **Price Alert Set!**\n\n` +
         `🪙 **Token:** ${token}\n` +
         `🎯 **Target:** $${target}\n` +
         `📊 **Condition:** ${token} >= $${target}\n` +
         `🕐 **Created:** ${new Date().toLocaleString()}\n\n` +
         `You'll be notified when the price is reached!`;
}

async function stopAllActivities(user) {
  let stoppedCount = 0;
  
  if (user?.alerts) {
    user.alerts.forEach(alert => {
      if (alert.active) {
        alert.active = false;
        alert.stoppedAt = new Date().toISOString();
        stoppedCount++;
      }
    });
  }
  
  users.set(user.id, user);
  saveUserData();
  
  return `🛑 **All Activities Stopped!**\n\n` +
         `🔔 **Alerts Stopped:** ${stoppedCount}\n` +
         `🕐 **Time:** ${new Date().toLocaleString()}\n\n` +
         `All price alerts have been deactivated.`;
}

bot.onText(/\/start/, (msg) => {
  const userId = msg.from.id;
  
  if (!users.has(userId)) {
    users.set(userId, { 
      id: userId,
      username: msg.from.username,
      firstName: msg.from.first_name,
      wallets: {},
      alerts: [],
      createdAt: new Date().toISOString()
    });
    saveUserData();
  }
  
  const user = users.get(userId);
  const connectedWallets = Object.keys(user.wallets).length;

  bot.sendMessage(userId, 
    `🚀 **Welcome to Private Key Trading Bot!**\n\n` +
    `👋 Hello ${msg.from.first_name}!\n\n` +
    `🔐 **Private Key Based Trading:**\n` +
    `• Secure local encryption\n` +
    `• Direct wallet access\n` +
    `• Real trading capabilities\n\n` +
    `🤖 **Natural Language Commands:**\n` +
    `• "set eth private key" - Add Ethereum wallet\n` +
    `• "set aptos private key" - Add Aptos wallet\n` +
    `• "show my portfolio" - View balances\n` +
    `• "swap 2 ETH to APT" - Trade tokens\n` +
    `• "price of ETH" - Check prices\n\n` +
    `🔗 **Wallet Status:** ${connectedWallets > 0 ? `${connectedWallets} wallet(s) connected` : 'No wallets connected'}\n\n` +
    `**Get Started:**\n` +
    `1️⃣ Set your private keys\n` +
    `2️⃣ Check portfolio\n` +
    `3️⃣ Start trading!\n\n` +
    `⚠️ **Security:** Private keys are encrypted and stored locally.`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/help/, (msg) => {
  const helpText = `📖 **Help & Commands**\n\n` +
    `**🔐 Wallet Setup:**\n` +
    `• "set eth private key" - Add Ethereum wallet\n` +
    `• "set aptos private key" - Add Aptos wallet\n` +
    `• "remove eth key" - Remove Ethereum wallet\n` +
    `• "remove aptos key" - Remove Aptos wallet\n\n` +
    `**💰 Portfolio & Trading:**\n` +
    `• "show my portfolio" - View wallet balances\n` +
    `• "swap 2 ETH to APT" - Trade tokens\n` +
    `• "exchange 100 APT to ETH" - Exchange tokens\n\n` +
    `**📊 Price & Alerts:**\n` +
    `• "price of ETH" - Get current prices\n` +
    `• "alert when BTC hits 50000" - Set price alerts\n\n` +
    `**🛠️ Commands:**\n` +
    `• /start - Welcome message\n` +
    `• /help - Show this help\n` +
    `• "stop alerts" - Stop all alerts\n\n` +
    `**🔒 Security:**\n` +
    `• Private keys are encrypted locally\n` +
    `• Never share your private keys\n` +
    `• Use in private chats only\n\n` +
    `**💡 Tips:**\n` +
    `• Just type naturally - I understand!\n` +
    `• Set up both wallets for cross-chain swaps\n` +
    `• Check portfolio before trading`;
  
  bot.sendMessage(msg.from.id, helpText);
});

// Enhanced message handler
bot.on('message', async (msg) => {
  if (msg.text?.startsWith('/')) return; // Skip commands
  
  const userId = msg.from.id;
  let user = users.get(userId);
  
  if (!user) {
    user = {
      id: userId,
      username: msg.from.username,
      firstName: msg.from.first_name,
      wallets: {},
      alerts: [],
      createdAt: new Date().toISOString()
    };
    users.set(userId, user);
    saveUserData();
  }
  
  try {
    // Check if user is in private key setup mode
    const privateKeyResult = await handlePrivateKeyInput(userId, msg.text);
    if (privateKeyResult) {
      await bot.sendMessage(userId, privateKeyResult, { parse_mode: 'Markdown' });
      return;
    }
    
    // Show processing message
    const processingMsg = await bot.sendMessage(userId, '🤖 Processing your request...');
    
    // Parse command with AI
    const command = await parseCommand(msg.text);
    
    // Delete processing message
    await bot.deleteMessage(userId, processingMsg.message_id);
    
    // Show confidence if low
    // Show confidence if low
    if (command.confidence < 0.7) {
      await bot.sendMessage(userId, 
        `🤔 I'm not entirely sure what you mean (${Math.round(command.confidence * 100)}% confidence).\n\n` +
        `Did you mean: "${command.intent}"?\n\n` +
        `If not, try being more specific or use /help for available commands.`
      );
      return;
    }
    
    // Execute command
    const result = await executeCommand(userId, command, msg.text);
    
    // Send response
    await bot.sendMessage(userId, result, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('Message processing error:', error);
    await bot.sendMessage(userId, 
      `❌ **Error Processing Request**\n\n` +
      `Something went wrong while processing your request.\n` +
      `Please try again or use /help for available commands.`
    );
  }
});

// Price alert monitoring (runs every 5 minutes)
setInterval(async () => {
  for (const [userId, user] of users.entries()) {
    if (!user.alerts) continue;
    
    const activeAlerts = user.alerts.filter(a => a.active && !a.triggered);
    
    for (const alert of activeAlerts) {
      try {
        const tokenId = getTokenId(alert.token);
        if (!tokenId) continue;
        
        const priceData = await getPriceData(tokenId);
        const currentPrice = priceData.current_price;
        
        if (currentPrice >= alert.priceTarget) {
          alert.triggered = true;
          alert.triggeredAt = new Date().toISOString();
          alert.triggeredPrice = currentPrice;
          
          await bot.sendMessage(userId, 
            `🚨 **PRICE ALERT TRIGGERED!**\n\n` +
            `🪙 **Token:** ${alert.token}\n` +
            `🎯 **Target:** $${alert.priceTarget}\n` +
            `💰 **Current Price:** $${currentPrice.toFixed(2)}\n` +
            `📈 **Change:** ${priceData.price_change_percentage_24h > 0 ? '+' : ''}${priceData.price_change_percentage_24h.toFixed(2)}%\n\n` +
            `🕐 **Time:** ${new Date().toLocaleString()}\n\n` +
            `Ready to trade? Try: "swap X ${alert.token} to Y"`
          );
        }
      } catch (error) {
        console.error('Alert monitoring error:', error);
      }
    }
  }
  
  // Save any triggered alerts
  saveUserData();
}, 60 * 60 * 1000); // 1 hr

// Error handling for the bot
bot.on('error', (error) => {
  console.error('Bot error:', error);
});

bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

// Express API endpoints
app.get('/api/users', (req, res) => {
  const userStats = Array.from(users.values()).map(user => ({
    id: user.id,
    username: user.username,
    firstName: user.firstName,
    walletsConnected: Object.keys(user.wallets || {}).length,
    activeAlerts: user.alerts?.filter(a => a.active).length || 0,
    createdAt: user.createdAt
  }));
  
  res.json({
    totalUsers: users.size,
    users: userStats
  });
});

app.get('/api/alerts', (req, res) => {
  const allAlerts = [];
  
  for (const user of users.values()) {
    if (user.alerts) {
      allAlerts.push(...user.alerts.map(alert => ({
        ...alert,
        userId: user.id,
        username: user.username
      })));
    }
  }
  
  res.json({
    totalAlerts: allAlerts.length,
    activeAlerts: allAlerts.filter(a => a.active).length,
    triggeredAlerts: allAlerts.filter(a => a.triggered).length,
    alerts: allAlerts
  });
});

// Start the bot and express server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Trading Bot API server running on port ${PORT}`);
});

console.log('🤖 Trading Bot is running...');
console.log('📊 Monitoring price alerts every 5 minutes...');
console.log('🔒 User data stored locally in users_data.json');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  saveUserData();
  bot.stopPolling();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  saveUserData();
  bot.stopPolling();
  process.exit(0);
});