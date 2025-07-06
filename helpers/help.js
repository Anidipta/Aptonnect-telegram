// Help text and command explanations

function getHelpText() {
  return `📖 **Complete Help Guide**\n\n` +
    `**🔐 Private Key Setup:**\n` +
    `• "set eth private key" - Add your Ethereum wallet\n` +
    `• "set aptos private key" - Add your Aptos wallet\n` +
    `• "remove eth key" - Remove Ethereum wallet\n` +
    `• "remove aptos key" - Remove Aptos wallet\n\n` +
    
    `**💰 Portfolio Management:**\n` +
    `• "show my portfolio" - View all wallet balances\n` +
    `• "check my balance" - Same as portfolio\n` +
    `• "my wallets" - Show connected wallets\n\n` +
    
    `**🔄 Token Swapping:**\n` +
    `• "swap 2 ETH to APT" - Swap Ethereum to Aptos\n` +
    `• "exchange 100 APT to ETH" - Exchange Aptos to Ethereum\n` +
    `• "trade 1 ETH for USDC" - Trade on same chain\n` +
    `• "convert 50 USDC to ETH" - Convert tokens\n\n` +
    
    `**📊 Price Information:**\n` +
    `• "price of ETH" - Get current Ethereum price\n` +
    `• "what's the price of APT" - Check Aptos price\n` +
    `• "BTC price" - Get Bitcoin price\n` +
    `• "check USDC price" - Check stablecoin price\n\n` +
    
    `**🚨 Price Alerts:**\n` +
    `• "alert when ETH hits 3000" - Set price alert\n` +
    `• "notify me when BTC reaches 50000" - Price notification\n` +
    `• "stop alerts" - Stop all active alerts\n\n` +
    
    `**🛠️ Bot Commands:**\n` +
    `• /start - Welcome message and setup\n` +
    `• /help - Show this help guide\n` +
    `• "stop" - Stop all activities\n\n` +
    
    `**🔒 Security Features:**\n` +
    `• Private keys are encrypted with AES-256\n` +
    `• Keys stored locally, never transmitted\n` +
    `• Each user has unique encryption\n` +
    `• Secure wallet validation\n\n` +
    
    `**💡 Usage Tips:**\n` +
    `• Use natural language - I understand context!\n` +
    `• Set up both wallets for cross-chain swaps\n` +
    `• Check portfolio before making trades\n` +
    `• Always verify transaction details\n` +
    `• Keep your private keys secure\n\n` +
    
    `**⚠️ Important Notes:**\n` +
    `• Only use in private chats\n` +
    `• Never share your private keys\n` +
    `• Test with small amounts first\n` +
    `• Gas fees apply to all transactions\n\n` +
    
    `**🌐 Supported Networks:**\n` +
    `• Ethereum Mainnet (ETH, USDC, USDT)\n` +
    `• Aptos Mainnet (APT)\n` +
    `• Cross-chain swaps available\n\n` +
    
    `Need specific help? Just ask naturally!`;
}

function getSwapHelp() {
  return `🔄 **Swap Commands Help**\n\n` +
    `**Basic Format:**\n` +
    `"swap [amount] [from_token] to [to_token]"\n\n` +
    
    `**Examples:**\n` +
    `• "swap 2 ETH to APT" - Cross-chain swap\n` +
    `• "exchange 100 APT to ETH" - Reverse swap\n` +
    `• "trade 1 ETH for USDC" - Same chain trade\n` +
    `• "convert 500 USDC to ETH" - Convert back\n\n` +
    
    `**Supported Tokens:**\n` +
    `• **Ethereum:** ETH, USDC, USDT\n` +
    `• **Aptos:** APT\n` +
    `• **Cross-chain:** All combinations\n\n` +
    
    `**What Happens:**\n` +
    `1. Bot gets current prices\n` +
    `2. Calculates swap rate\n` +
    `3. Checks your balance\n` +
    `4. Executes the swap\n` +
    `5. Provides transaction hash\n\n` +
    
    `**Requirements:**\n` +
    `• Wallet must be connected\n` +
    `• Sufficient balance\n` +
    `• Valid token pair\n` +
    `• Gas fees covered`;
}

function getPriceHelp() {
  return `💹 **Price Commands Help**\n\n` +
    `**Basic Format:**\n` +
    `"price of [token]" or "what's [token] price"\n\n` +
    
    `**Examples:**\n` +
    `• "price of ETH" - Get Ethereum price\n` +
    `• "what's the price of APT" - Check Aptos\n` +
    `• "BTC price" - Get Bitcoin price\n` +
    `• "check USDC price" - Check stablecoin\n\n` +
    
    `**Information Provided:**\n` +
    `• Current USD price\n` +
    `• 24h price change (%)\n` +
    `• 24h trading volume\n` +
    `• Market capitalization\n` +
    `• Last updated time\n\n` +
    
    `**Supported Tokens:**\n` +
    `ETH, BTC, APT, USDC, USDT, BNB, SOL, ADA, DOT, MATIC, AVAX, LINK, UNI, ATOM, FTM`;
}

function getAlertHelp() {
  return `🚨 **Price Alert Help**\n\n` +
    `**Basic Format:**\n` +
    `"alert when [token] hits [price]"\n\n` +
    
    `**Examples:**\n` +
    `• "alert when ETH hits 3000" - Set ETH alert\n` +
    `• "notify me when BTC reaches 50000" - BTC alert\n` +
    `• "tell me when APT gets to 20" - APT alert\n\n` +
    
    `**How It Works:**\n` +
    `• Bot checks prices every 5 minutes\n` +
    `• Sends notification when target reached\n` +
    `• Alert automatically deactivates after trigger\n` +
    `• Multiple alerts per token allowed\n\n` +
    
    `**Management:**\n` +
    `• "stop alerts" - Stop all active alerts\n` +
    `• Check portfolio to see active alerts\n` +
    `• Alerts survive bot restarts`;
}

function getSecurityHelp() {
  return `🔒 **Security & Privacy Help**\n\n` +
    `**Private Key Security:**\n` +
    `• Keys encrypted with AES-256 algorithm\n` +
    `• Each user has unique encryption key\n` +
    `• Keys never transmitted over network\n` +
    `• Stored locally in encrypted format\n\n` +
    
    `**Best Practices:**\n` +
    `• Only use in private chats\n` +
    `• Never share private keys\n` +
    `• Test with small amounts first\n` +
    `• Keep backup of your keys\n` +
    `• Monitor your wallets regularly\n\n` +
    
    `**What Bot Stores:**\n` +
    `• Encrypted private keys\n` +
    `• Wallet addresses\n` +
    `• Alert preferences\n` +
    `• Transaction history\n\n` +
    
    `**What Bot Doesn't Store:**\n` +
    `• Plain text private keys\n` +
    `• Seed phrases\n` +
    `• Personal information\n` +
    `• Chat history\n\n` +
    
    `**Remove Data:**\n` +
    `• "remove eth key" - Delete Ethereum wallet\n` +
    `• "remove aptos key" - Delete Aptos wallet`;
}

function getSetupHelp() {
  return `🔧 **Setup Guide**\n\n` +
    `**Step 1: Add Wallets**\n` +
    `• "set eth private key" - Add Ethereum wallet\n` +
    `• "set aptos private key" - Add Aptos wallet\n` +
    `• Follow prompts to enter private keys\n\n` +
    
    `**Step 2: Verify Setup**\n` +
    `• "show my portfolio" - Check wallet connections\n` +
    `• Verify addresses are correct\n` +
    `• Check balances are displayed\n\n` +
    
    `**Step 3: Test Features**\n` +
    `• "price of ETH" - Test price checking\n` +
    `• "alert when ETH hits 3000" - Test alerts\n` +
    `• Small test swap if desired\n\n` +
    
    `**Troubleshooting:**\n` +
    `• Ensure private keys are valid\n` +
    `• Check network connectivity\n` +
    `• Verify sufficient gas fees\n` +
    `• Contact support if issues persist`;
}

function getQuickStart() {
  return `🚀 **Quick Start Guide**\n\n` +
    `**New User? Start Here:**\n` +
    `1️⃣ "set eth private key" - Add Ethereum wallet\n` +
    `2️⃣ "set aptos private key" - Add Aptos wallet\n` +
    `3️⃣ "show my portfolio" - Check your setup\n` +
    `4️⃣ "price of ETH" - Check current prices\n` +
    `5️⃣ "swap 0.1 ETH to APT" - Make your first swap\n\n` +
    
    `**Need Help?**\n` +
    `• "help swap" - Swap commands\n` +
    `• "help price" - Price commands\n` +
    `• "help alerts" - Alert commands\n` +
    `• "help security" - Security info\n\n` +
    
    `**Common Commands:**\n` +
    `• Portfolio: "show my portfolio"\n` +
    `• Swap: "swap 1 ETH to APT"\n` +
    `• Price: "price of BTC"\n` +
    `• Alerts: "alert when ETH hits 3000"\n` +
    `• Stop: "stop" - Stop all activities\n\n` +
    
    `**Tips:**\n` +
    `• Use natural language - I understand context!\n` +
    `• Set up both wallets for cross-chain swaps\n` +
    `• Check portfolio before making trades\n` +
    `• Always verify transaction details`;
}
function getGeneralHelp() {
  return `ℹ️ **General Help Guide**\n\n` +
    `**Commands Overview:**\n` +
    `• "set eth private key" - Add Ethereum wallet\n` +
    `• "set aptos private key" - Add Aptos wallet\n` +
    `• "show my portfolio" - View all wallet balances\n` +
    `• "swap 2 ETH to APT" - Swap Ethereum to Aptos\n` +
    `• "price of ETH" - Get current Ethereum price\n` +
    `• "alert when ETH hits 3000" - Set price alert\n` +
    `• "stop" - Stop all activities\n\n` +
    
    `**Security Features:**\n` +
    `• Private keys encrypted with AES-256\n` +
    `• Keys stored locally, never transmitted\n` +
    `• Each user has unique encryption key\n\n` +
    
    `**Usage Tips:**\n` +
    `• Use natural language - I understand context!\n` +
    `• Set up both wallets for cross-chain swaps\n` +
    `• Check portfolio before making trades`;
}
module.exports= {
  getHelpText,
  getSwapHelp,
  getPriceHelp,
  getAlertHelp,
  getSecurityHelp,
  getSetupHelp,
  getQuickStart,
  getGeneralHelp
};