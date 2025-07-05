// helpers/priceService.js
const axios = require('axios');

// Cache for price data to avoid API rate limits
const priceCache = new Map();
const CACHE_DURATION = 60000; // 1 minute

// Get price data from CoinGecko API
async function getPriceData(tokenId) {
  const cacheKey = tokenId.toLowerCase();
  const cached = priceCache.get(cacheKey);
  
  // Return cached data if still valid
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return cached.data;
  }
  
  try {
    const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
      params: {
        ids: tokenId,
        vs_currencies: 'usd',
        include_24hr_change: true,
        include_market_cap: true,
        include_24hr_vol: true,
        include_last_updated_at: true
      }
    });
    
    const data = response.data[tokenId];
    
    if (!data) {
      throw new Error(`Price data not found for ${tokenId}`);
    }
    
    const priceData = {
      current_price: data.usd,
      price_change_percentage_24h: data.usd_24h_change || 0,
      market_cap: data.usd_market_cap || 0,
      total_volume: data.usd_24h_vol || 0,
      last_updated: data.last_updated_at
    };
    
    // Cache the data
    priceCache.set(cacheKey, {
      data: priceData,
      timestamp: Date.now()
    });
    
    return priceData;
    
  } catch (error) {
    console.error(`Error fetching price for ${tokenId}:`, error.message);
    
    // Return cached data if available, even if expired
    if (cached) {
      return cached.data;
    }
    
    throw error;
  }
}

// Get multiple token prices at once
async function getMultiplePrices(tokenIds) {
  const results = {};
  
  try {
    const idsString = tokenIds.join(',');
    const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
      params: {
        ids: idsString,
        vs_currencies: 'usd',
        include_24hr_change: true,
        include_market_cap: true,
        include_24hr_vol: true,
        include_last_updated_at: true
      }
    });
    
    for (const tokenId of tokenIds) {
      const data = response.data[tokenId];
      if (data) {
        results[tokenId] = {
          current_price: data.usd,
          price_change_percentage_24h: data.usd_24h_change || 0,
          market_cap: data.usd_market_cap || 0,
          total_volume: data.usd_24h_vol || 0,
          last_updated: data.last_updated_at
        };
        
        // Cache individual results
        priceCache.set(tokenId, {
          data: results[tokenId],
          timestamp: Date.now()
        });
      }
    }
    
    return results;
    
  } catch (error) {
    console.error('Error fetching multiple prices:', error.message);
    throw error;
  }
}

// Format price data for display
function formatPriceData(symbol, priceData) {
  const price = priceData.current_price;
  const change = priceData.price_change_percentage_24h;
  const changeEmoji = change >= 0 ? '📈' : '📉';
  const changeColor = change >= 0 ? '+' : '';
  
  return `${changeEmoji} **${symbol.toUpperCase()}**: $${formatNumber(price)}\n` +
         `   • 24h Change: ${changeColor}${change.toFixed(2)}%\n` +
         `   • Market Cap: $${formatLargeNumber(priceData.market_cap)}\n` +
         `   • Volume: $${formatLargeNumber(priceData.total_volume)}\n\n`;
}

// Format compact price data for portfolio
function formatCompactPrice(symbol, priceData) {
  const price = priceData.current_price;
  const change = priceData.price_change_percentage_24h;
  const changeEmoji = change >= 0 ? '📈' : '📉';
  const changeColor = change >= 0 ? '+' : '';
  
  return `${changeEmoji} ${symbol.toUpperCase()}: $${formatNumber(price)} (${changeColor}${change.toFixed(2)}%)`;
}

// Format numbers with appropriate decimal places
function formatNumber(num) {
  if (num >= 1000) {
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
  } else if (num >= 1) {
    return num.toFixed(2);
  } else if (num >= 0.01) {
    return num.toFixed(4);
  } else {
    return num.toFixed(8);
  }
}

// Format large numbers with K, M, B suffixes
function formatLargeNumber(num) {
  if (num >= 1e12) {
    return (num / 1e12).toFixed(2) + 'T';
  } else if (num >= 1e9) {
    return (num / 1e9).toFixed(2) + 'B';
  } else if (num >= 1e6) {
    return (num / 1e6).toFixed(2) + 'M';
  } else if (num >= 1e3) {
    return (num / 1e3).toFixed(2) + 'K';
  } else {
    return num.toFixed(2);
  }
}

// Get trending tokens
async function getTrendingTokens() {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/search/trending');
    return response.data.coins.slice(0, 10); // Top 10 trending
  } catch (error) {
    console.error('Error fetching trending tokens:', error.message);
    return [];
  }
}

// Get market overview
async function getMarketOverview() {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/global');
    const data = response.data.data;
    
    return {
      total_market_cap: data.total_market_cap.usd,
      total_volume: data.total_volume.usd,
      market_cap_percentage: data.market_cap_percentage,
      market_cap_change_24h: data.market_cap_change_percentage_24h_usd
    };
  } catch (error) {
    console.error('Error fetching market overview:', error.message);
    return null;
  }
}

// Format market overview for display
function formatMarketOverview(marketData) {
  if (!marketData) return 'Unable to fetch market data';
  
  const totalMc = formatLargeNumber(marketData.total_market_cap);
  const totalVol = formatLargeNumber(marketData.total_volume);
  const change = marketData.market_cap_change_24h;
  const changeEmoji = change >= 0 ? '📈' : '📉';
  const changeColor = change >= 0 ? '+' : '';
  
  return `🌍 **Global Market Overview**\n\n` +
         `💰 Total Market Cap: $${totalMc}\n` +
         `📊 24h Volume: $${totalVol}\n` +
         `${changeEmoji} 24h Change: ${changeColor}${change.toFixed(2)}%\n\n` +
         `🥇 BTC Dominance: ${marketData.market_cap_percentage.btc.toFixed(1)}%\n` +
         `🥈 ETH Dominance: ${marketData.market_cap_percentage.eth.toFixed(1)}%`;
}

// Get token information (extended data)
async function getTokenInfo(tokenId) {
  try {
    const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${tokenId}`);
    const data = response.data;
    
    return {
      id: data.id,
      name: data.name,
      symbol: data.symbol.toUpperCase(),
      current_price: data.market_data.current_price.usd,
      market_cap: data.market_data.market_cap.usd,
      market_cap_rank: data.market_cap_rank,
      total_volume: data.market_data.total_volume.usd,
      high_24h: data.market_data.high_24h.usd,
      low_24h: data.market_data.low_24h.usd,
      price_change_24h: data.market_data.price_change_24h,
      price_change_percentage_24h: data.market_data.price_change_percentage_24h,
      price_change_percentage_7d: data.market_data.price_change_percentage_7d,
      price_change_percentage_30d: data.market_data.price_change_percentage_30d,
      ath: data.market_data.ath.usd,
      ath_change_percentage: data.market_data.ath_change_percentage.usd,
      atl: data.market_data.atl.usd,
      atl_change_percentage: data.market_data.atl_change_percentage.usd,
      circulating_supply: data.market_data.circulating_supply,
      total_supply: data.market_data.total_supply,
      max_supply: data.market_data.max_supply,
      description: data.description.en ? data.description.en.split('.')[0] + '.' : 'No description available'
    };
  } catch (error) {
    console.error(`Error fetching token info for ${tokenId}:`, error.message);
    throw error;
  }
}

// Format detailed token information
function formatTokenInfo(tokenInfo) {
  const change24h = tokenInfo.price_change_percentage_24h;
  const change7d = tokenInfo.price_change_percentage_7d;
  const change30d = tokenInfo.price_change_percentage_30d;
  
  const emoji24h = change24h >= 0 ? '📈' : '📉';
  const emoji7d = change7d >= 0 ? '📈' : '📉';
  const emoji30d = change30d >= 0 ? '📈' : '📉';
  
  return `🪙 **${tokenInfo.name} (${tokenInfo.symbol})**\n\n` +
         `💰 Price: $${formatNumber(tokenInfo.current_price)}\n` +
         `📊 Market Cap: $${formatLargeNumber(tokenInfo.market_cap)} (#${tokenInfo.market_cap_rank})\n` +
         `📈 24h Volume: $${formatLargeNumber(tokenInfo.total_volume)}\n\n` +
         `📊 **Price Changes:**\n` +
         `${emoji24h} 24h: ${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%\n` +
         `${emoji7d} 7d: ${change7d >= 0 ? '+' : ''}${change7d.toFixed(2)}%\n` +
         `${emoji30d} 30d: ${change30d >= 0 ? '+' : ''}${change30d.toFixed(2)}%\n\n` +
         `🔼 24h High: $${formatNumber(tokenInfo.high_24h)}\n` +
         `🔽 24h Low: $${formatNumber(tokenInfo.low_24h)}\n\n` +
         `🚀 All-Time High: $${formatNumber(tokenInfo.ath)}\n` +
         `🔻 All-Time Low: $${formatNumber(tokenInfo.atl)}\n\n` +
         `💎 Circulating Supply: ${formatLargeNumber(tokenInfo.circulating_supply)} ${tokenInfo.symbol}\n` +
         `🏆 Max Supply: ${tokenInfo.max_supply ? formatLargeNumber(tokenInfo.max_supply) : 'N/A'} ${tokenInfo.symbol}`;
}

// Clear cache (for testing or manual refresh)
function clearPriceCache() {
  priceCache.clear();
}

// Get cache statistics
function getCacheStats() {
  return {
    size: priceCache.size,
    entries: Array.from(priceCache.keys())
  };
}

module.exports = {
  getPriceData,
  getMultiplePrices,
  formatPriceData,
  formatCompactPrice,
  formatNumber,
  formatLargeNumber,
  getTrendingTokens,
  getMarketOverview,
  formatMarketOverview,
  getTokenInfo,
  formatTokenInfo,
  clearPriceCache,
  getCacheStats
};