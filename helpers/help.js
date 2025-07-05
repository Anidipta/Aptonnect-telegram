// helpers/help.js

function getHelpText() {
  return `
📚 **Enhanced Trading Bot - Help Guide**

🤖 **Natural Language Commands:**
I understand natural language! You can type commands like:

📊 **Portfolio & Balance:**
• "Show my portfolio"
• "What's my balance?"
• "Check my wallet"
• "Portfolio summary"

💹 **Price Information:**
• "What's the price of ETH?"
• "Show BTC price"
• "Current APT price"
• "Check prices for ETH, BTC, APT"

🔔 **Price Alerts:**
• "Alert when ETH hits $3000"
• "Notify me when BTC reaches 50000"
• "Set alert for APT at $15"

💱 **Trading (Coming Soon):**
• "Buy 100 USDC of APT"
• "Swap 0.5 ETH to APT"
• "Trade 1000 USDT for BTC"

🔗 **Wallet Management:**
• "Connect wallet" → Use /connect
• "Disconnect wallets"
• "Stop all alerts"

📋 **Quick Commands:**
• /start - Welcome message
• /connect - Connect wallets
• /help - Show this help

🔧 **Supported Wallets:**
• 🦊 MetaMask (Ethereum)
• 🅿️ Petra Wallet (Aptos)

💡 **Tips:**
• Connect wallets through secure browser popup
• No private keys stored on our servers
• Real-time price data from CoinGecko
• AI powered - just type naturally!

❓ **Need more help?** Just ask me anything!
`;
}

function getConnectHelpText() {
  return `
🔗 **Wallet Connection Guide**

🔐 **Secure Connection:**
• Click wallet buttons to open browser popup
• Approve connection in your wallet
• No private keys shared with bot
• Connection handled by wallet extension

🦊 **MetaMask (Ethereum):**
• Supports ETH and ERC-20 tokens
• Mainnet and testnets supported
• Portfolio tracking included

🅿️ **Petra Wallet (Aptos):**
• Supports APT and Aptos tokens
• Mainnet and devnet supported
• Portfolio tracking included

⚡ **Benefits:**
• Real-time balance updates
• Combined portfolio view
• Price alerts for your tokens
• Secure trading (coming soon)

🔄 **Reconnection:**
• Use /connect anytime to reconnect
• Previous connections automatically restored
• Disconnect anytime with "disconnect wallets"
`;
}

function getTradingHelpText() {
  return `
💱 **Trading Features (Coming Soon)**

🎯 **Natural Language Trading:**
• "Buy 100 USDC of APT"
• "Swap 0.5 ETH to APT"
• "Trade 1000 USDT for BTC"

🔄 **Cross-Chain Support:**
• Ethereum ↔ Aptos
• Automatic bridging
• Best rate finding

⚡ **Auto-Approval:**
• Pre-approve transactions
• Seamless trading experience
• No repeated confirmations

🛡️ **Security:**
• Non-custodial trading
• Your keys, your crypto
• Secure wallet integration

📊 **Analytics:**
• Trade history tracking
• P&L calculations
• Performance metrics

🔔 **Smart Alerts:**
• Price-based alerts
• Trade execution alerts
• Portfolio notifications

Stay tuned for trading features!
`;
}

function getPriceHelpText() {
  return `
💹 **Price Information Features**

📈 **Real-Time Prices:**
• Live data from CoinGecko API
• 24h price changes
• Market cap and volume
• Price alerts and notifications

🪙 **Supported Tokens:**
• ETH (Ethereum)
• BTC (Bitcoin)
• APT (Aptos)
• USDC (USD Coin)
• USDT (Tether)
• BNB (Binance Coin)
• SOL (Solana)
• ADA (Cardano)
• DOT (Polkadot)
• MATIC (Polygon)

📊 **Price Commands:**
• "What's the price of ETH?"
• "Show BTC price"
• "Current prices for ETH, BTC, APT"
• "Check USDC price"

🔔 **Price Alerts:**
• "Alert when ETH hits $3000"
• "Notify me when BTC reaches 50000"
• "Set alert for APT at $15"
• Automatic notifications when targets hit

💡 **Pro Tips:**
• Get multiple prices: "Show ETH, BTC, APT prices"
• Set multiple alerts for different targets
• Check price changes and trends
• Monitor your portfolio tokens
`;
}

module.exports = {
  getHelpText,
  getConnectHelpText,
  getTradingHelpText,
  getPriceHelpText
};