# Aptonnect - AI-Powered Telegram Crypto Assistant

**Aptonnect** is an advanced Telegram bot that enables seamless crypto portfolio tracking, price alerts, and token swaps across **Ethereum** and **Aptos**—all with natural language commands powered by **Gen AI RAG Agent**.

## Deployed Contract Addresses

ETH --> https://sepolia.etherscan.io/address/0xF011379e3bfE345B426a40198C253791Ba14FEcD

Aptos --> https://explorer.aptoslabs.com/txn/0xd8f267d0f1e10b06ab6ce64b490bd290de77755150ea430fbc3eeba7fdad11e1?network=devnet


> 🔐 Encrypted wallet integration | 🧠 AI-powered command parsing | 🔄 Cross-chain token swap | 📈 Real-time portfolio insights | 🚨 Price alerts

---

## 🚀 Features

### 🔐 Secure Wallet Integration
- Connect wallets using **private keys** (Ethereum & Aptos).
- Handles various formats including:
  - `0x...` hex
  - `ed25519-priv-...` for Aptos
- Locally encrypted storage of user keys (`users_data.json`).
- Cancel option during setup for added security.

### 🧠 AI-Powered Command Parsing (RAG AGENTIC Gemini )
- Parse natural language instructions like:
  - `Swap 0.1 ETH to USDT`
  - `What’s my Aptos balance?`
  - `Alert me when BTC hits 50K`


### 📊 Portfolio Tracking

* View real-time wallet balances in **USD**.
* Fetches token prices.
* Displays:

  * Token name & balance
  * USD price
  * 24h % change
  * Total portfolio value

### 🔄 Token Swaps (ETH ↔ APT) ( In progress..)

* AI-triggered or manual swaps.
* Verifies both wallets before executing.
* Returns:

  * Amount received
  * Gas used
  * TX hash
  * Explorer link

### 🚨 Price Alerts

* Set alerts using natural language:

  * `Alert when BTC > 50000`
  * `Notify me if APT < 7`
* Alert status saved and checked every hour.
* Auto-triggers notifications in Telegram.

### 📡 RESTful API (Node.js Express)

* `/api/users`: Connected users, balances, keys.
* `/api/alerts`: All current price alerts.

---

## Tech Stack

- React.JS, Javascript, Typescript, HTML
- Express.JS, Next.JS, Axion, REST API
- MOVE, Solidity, Aptos-SDK, Connect Wallet, Petra Wallet

---

## 💡 What’s New (vs Ziptos)

| Feature                       | Ziptos ❌ | Aptonnect ✅ |
| ----------------------------- | -------- | ----------- |
| Gemini AI Command Parsing     | ❌        | ✅           |
| Ethereum Wallet Support       | Partial  | ✅           |
| Aptos Wallet Support          | ❌        | ✅           |
| Encrypted Key Storage         | ❌        | ✅           |
| Cancel Key Setup Flow         | ❌        | ✅           |
| Real-Time Portfolio Tracking  | ❌        | ✅           |
| Cross-Chain Token Swap        | ❌        | Partial           |
| Price Alerts & Notifications  | ❌        | ✅           |
| Express REST API              | ❌        | ✅           |
| TX Receipts with Explorer URL | ❌        | ✅           |

---

## ⚙️ Installation

```bash
git clone https://github.com/Anidipta/Aptonnect-telegram.git
cd Aptonnect-telegram
npm install
```

### Add `.env` file:

```env
BOT_TOKEN=your_telegram_bot_token
GEMINI_API_KEY=your_gemini_api_key
ETH_RPC_URL=https://your.eth.rpc
APTOS_NODE_URL=https://fullnode.devnet.aptoslabs.com/v1
```

---

## ▶️ Running the Bot

```bash
npm start
```

Go to the [bot](https://t.me/aptonnect_bot)
---

## 🛡️ Security Notes

* **Private keys are encrypted locally** using AES.
* No keys are sent to Gemini or 3rd parties.
* Data is saved in `users_data.json`.

---

## 📌 Future Roadmap

* 🔁 More chains: Solana, Polygon
* 📊 Token trend charting
* 🔐 Telegram PIN before sensitive actions
* 🌉 Cross-chain bridge integration (Wormhole, LayerZero)

---

## 👨‍💻 Author

**Anidipta Pal**
Email: [anidiptapal@gmail.com](mailto:anidiptapal@gmail.com)

GitHub: [github.com/Anidipta](https://github.com/Anidipta)

Twitter: [x.com/AnidiptaP](https://x.com/AnidiptaP)