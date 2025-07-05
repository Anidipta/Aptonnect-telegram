const { ethers } = require('ethers');
const { AptosClient, AptosAccount, HexString } = require('aptos');
const { decryptPrivateKey } = require('./encryption');

// Uniswap V3 Router address on Ethereum mainnet
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

// Common token addresses on Ethereum
const ETHEREUM_TOKENS = {
  'ETH': '0x0000000000000000000000000000000000000000',
  'USDC': '0xA0b86a33E6417c18c2c6E6C5f85A1EA9b16a9c7f',
  'USDT': '0xdac17f958d2ee523a2206206994597c13d831ec7',
  'WETH': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
};

// Aptos coin types
const APTOS_COINS = {
  'APT': '0x1::aptos_coin::AptosCoin',
  'USDC': '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC'
};

/**
 * Executes a token swap on Ethereum using Uniswap V3
 * @param {string} encryptedPrivateKey - Encrypted private key data
 * @param {string} password - Password for decryption
 * @param {string} fromToken - Source token symbol
 * @param {string} toToken - Destination token symbol
 * @param {string} amount - Amount to swap
 * @param {object} provider - Ethereum provider
 * @returns {object} Transaction result
 */
async function executeEthereumSwap(encryptedPrivateKey, password, fromToken, toToken, amount, provider) {
  try {
    // Decrypt private key
    const privateKey = decryptPrivateKey(encryptedPrivateKey, password);
    
    // Create wallet instance
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Get token addresses
    const fromTokenAddress = ETHEREUM_TOKENS[fromToken.toUpperCase()];
    const toTokenAddress = ETHEREUM_TOKENS[toToken.toUpperCase()];
    
    if (!fromTokenAddress || !toTokenAddress) {
      throw new Error('Unsupported token pair');
    }
    
    // Convert amount to Wei (assuming 18 decimals)
    const amountInWei = ethers.parseEther(amount.toString());
    
    // Simple ETH to token swap (simplified for demo)
    let transaction;
    
    if (fromToken.toUpperCase() === 'ETH') {
      // ETH to Token swap
      const uniswapRouter = new ethers.Contract(
        UNISWAP_V3_ROUTER,
        [
          'function exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160)) external payable returns (uint256)'
        ],
        wallet
      );
      
      const params = {
        tokenIn: ETHEREUM_TOKENS['WETH'],
        tokenOut: toTokenAddress,
        fee: 3000, // 0.3%
        recipient: wallet.address,
        deadline: Math.floor(Date.now() / 1000) + 1800, // 30 minutes
        amountIn: amountInWei,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0
      };
      
      transaction = await uniswapRouter.exactInputSingle(params, {
        value: amountInWei,
        gasLimit: 300000
      });
      
    } else {
      // Token to ETH swap (requires approval first)
      const tokenContract = new ethers.Contract(
        fromTokenAddress,
        [
          'function approve(address spender, uint256 amount) returns (bool)',
          'function balanceOf(address account) view returns (uint256)'
        ],
        wallet
      );
      
      // Approve token spending
      const approvalTx = await tokenContract.approve(UNISWAP_V3_ROUTER, amountInWei);
      await approvalTx.wait();
      
      const uniswapRouter = new ethers.Contract(
        UNISWAP_V3_ROUTER,
        [
          'function exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160)) external returns (uint256)'
        ],
        wallet
      );
      
      const params = {
        tokenIn: fromTokenAddress,
        tokenOut: ETHEREUM_TOKENS['WETH'],
        fee: 3000,
        recipient: wallet.address,
        deadline: Math.floor(Date.now() / 1000) + 1800,
        amountIn: amountInWei,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0
      };
      
      transaction = await uniswapRouter.exactInputSingle(params, {
        gasLimit: 300000
      });
    }
    
    const receipt = await transaction.wait();
    
    return {
      success: true,
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      explorerUrl: `https://etherscan.io/tx/${receipt.transactionHash}`,
      network: 'Ethereum',
      fromToken,
      toToken,
      amount
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      network: 'Ethereum'
    };
  }
}

/**
 * Executes a token swap on Aptos
 * @param {string} encryptedPrivateKey - Encrypted private key data
 * @param {string} password - Password for decryption
 * @param {string} fromToken - Source token symbol
 * @param {string} toToken - Destination token symbol
 * @param {string} amount - Amount to swap
 * @param {object} aptosClient - Aptos client
 * @returns {object} Transaction result
 */
async function executeAptosSwap(encryptedPrivateKey, password, fromToken, toToken, amount, aptosClient) {
  try {
    // Decrypt private key
    const privateKey = decryptPrivateKey(encryptedPrivateKey, password);
    
    // Create account from private key
    const account = new AptosAccount(HexString.ensure(privateKey).toUint8Array());
    
    // Get coin types
    const fromCoinType = APTOS_COINS[fromToken.toUpperCase()];
    const toCoinType = APTOS_COINS[toToken.toUpperCase()];
    
    if (!fromCoinType || !toCoinType) {
      throw new Error('Unsupported token pair');
    }
    
    // Convert amount (Aptos uses 8 decimals for APT)
    const amountInOctas = Math.floor(parseFloat(amount) * 1e8);
    
    // For demo purposes, we'll create a simple transfer transaction
    // In a real implementation, you'd use a DEX like PancakeSwap or LiquidSwap
    const payload = {
      type: "entry_function_payload",
      function: "0x1::aptos_account::transfer",
      type_arguments: [],
      arguments: [
        account.address().hex(),
        amountInOctas.toString()
      ]
    };
    
    // Create and submit transaction
    const txnRequest = await aptosClient.generateTransaction(account.address(), payload);
    const signedTxn = await aptosClient.signTransaction(account, txnRequest);
    const transaction = await aptosClient.submitTransaction(signedTxn);
    
    // Wait for transaction confirmation
    await aptosClient.waitForTransaction(transaction.hash);
    
    return {
      success: true,
      transactionHash: transaction.hash,
      explorerUrl: `https://explorer.aptoslabs.com/txn/${transaction.hash}`,
      network: 'Aptos',
      fromToken,
      toToken,
      amount
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      network: 'Aptos'
    };
  }
}

/**
 * Executes a cross-chain swap (ETH to APT or APT to ETH)
 * @param {object} user - User data containing wallet information
 * @param {string} fromToken - Source token symbol
 * @param {string} toToken - Destination token symbol
 * @param {string} amount - Amount to swap
 * @param {object} providers - Object containing ETH and Aptos providers
 * @returns {object} Transaction result
 */
async function executeCrossChainSwap(user, fromToken, toToken, amount, providers) {
  try {
    // This would typically involve a bridge protocol
    // For now, we'll simulate with separate transactions
    
    const fromNetwork = isEthereumToken(fromToken) ? 'ethereum' : 'aptos';
    const toNetwork = isEthereumToken(toToken) ? 'ethereum' : 'aptos';
    
    if (fromNetwork === toNetwork) {
      throw new Error('Not a cross-chain swap');
    }
    
    // Step 1: Sell source token for stablecoin
    let firstSwapResult;
    if (fromNetwork === 'ethereum') {
      firstSwapResult = await executeEthereumSwap(
        user.wallets.ethereum.encryptedPrivateKey,
        user.wallets.ethereum.password,
        fromToken,
        'USDC',
        amount,
        providers.ethereum
      );
    } else {
      firstSwapResult = await executeAptosSwap(
        user.wallets.aptos.encryptedPrivateKey,
        user.wallets.aptos.password,
        fromToken,
        'USDC',
        amount,
        providers.aptos
      );
    }
    
    if (!firstSwapResult.success) {
      return firstSwapResult;
    }
    
    // Step 2: Bridge USDC (simulated)
    // In reality, this would use a bridge like Wormhole or LayerZero
    
    // Step 3: Buy destination token with USDC
    let secondSwapResult;
    if (toNetwork === 'ethereum') {
      secondSwapResult = await executeEthereumSwap(
        user.wallets.ethereum.encryptedPrivateKey,
        user.wallets.ethereum.password,
        'USDC',
        toToken,
        amount, // This should be the amount received from step 1
        providers.ethereum
      );
    } else {
      secondSwapResult = await executeAptosSwap(
        user.wallets.aptos.encryptedPrivateKey,
        user.wallets.aptos.password,
        'USDC',
        toToken,
        amount,
        providers.aptos
      );
    }
    
    return {
      success: true,
      crossChain: true,
      transactions: [firstSwapResult, secondSwapResult],
      fromToken,
      toToken,
      amount
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      crossChain: true
    };
  }
}

/**
 * Checks if a token is an Ethereum token
 * @param {string} token - Token symbol
 * @returns {boolean} True if Ethereum token
 */
function isEthereumToken(token) {
  return ['ETH', 'USDC', 'USDT', 'WETH'].includes(token.toUpperCase());
}

/**
 * Checks if a token is an Aptos token
 * @param {string} token - Token symbol
 * @returns {boolean} True if Aptos token
 */
function isAptosToken(token) {
  return ['APT'].includes(token.toUpperCase());
}

/**
 * Gets estimated gas fees for a transaction
 * @param {string} network - Network name (ethereum/aptos)
 * @param {object} provider - Network provider
 * @returns {object} Gas estimation
 */
async function getGasEstimation(network, provider) {
  try {
    if (network === 'ethereum') {
      const gasPrice = await provider.getGasPrice();
      const estimatedGas = 200000; // Estimated gas for swap
      
      return {
        gasPrice: ethers.formatUnits(gasPrice, 'gwei'),
        estimatedGas,
        totalCost: ethers.formatEther(gasPrice * BigInt(estimatedGas))
      };
    } else if (network === 'aptos') {
      return {
        gasPrice: '100', // Aptos gas price in Octas
        estimatedGas: 2000,
        totalCost: '0.0002' // Estimated APT cost
      };
    }
  } catch (error) {
    return {
      error: error.message
    };
  }
}

module.exports = {
  executeEthereumSwap,
  executeAptosSwap,
  executeCrossChainSwap,
  isEthereumToken,
  isAptosToken,
  getGasEstimation,
  ETHEREUM_TOKENS,
  APTOS_COINS
};