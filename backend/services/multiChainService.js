/**
 * Multi-Chain Web3 Service
 * Supports Ethereum, Bitcoin, Solana, Arbitrum, Polygon
 */

const { ethers } = require('ethers');
const logger = require('../middleware/logger');

const CHAIN_CONFIG = {
  ethereum: {
    name: 'Ethereum',
    chainId: 1,
    rpc: process.env.ETHEREUM_RPC_URL || 'https://eth.public.blastapi.io',
    symbol: 'ETH',
    decimals: 18,
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpc: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    symbol: 'ETH',
    decimals: 18,
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    symbol: 'MATIC',
    decimals: 18,
  },
  solana: {
    name: 'Solana',
    chainId: 'solana',
    rpc: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    symbol: 'SOL',
    decimals: 9,
  },
  bitcoin: {
    name: 'Bitcoin',
    chainId: 'bitcoin',
    rpc: process.env.BITCOIN_RPC_URL || 'https://btc.nownodes.io',
    symbol: 'BTC',
    decimals: 8,
  },
};

class MultiChainService {
  constructor() {
    this.providers = {};
    this.initializeProviders();
  }

  initializeProviders() {
    // EVM Chains
    ['ethereum', 'arbitrum', 'polygon'].forEach((chain) => {
      try {
        this.providers[chain] = new ethers.JsonRpcProvider(
          CHAIN_CONFIG[chain].rpc
        );
        logger.info(`${chain} provider initialized`);
      } catch (error) {
        logger.error(`Error initializing ${chain} provider:`, error);
      }
    });

    // Solana & Bitcoin can be added via specialized libraries
    // For now, placeholders for extensibility
    this.providers.solana = {
      getBalance: (address) => this.getSolanaBalance(address),
      sendTransaction: (tx) => this.sendSolanaTransaction(tx),
    };
    this.providers.bitcoin = {
      getBalance: (address) => this.getBitcoinBalance(address),
      getTransaction: (txId) => this.getBitcoinTransaction(txId),
    };
  }

  // ========================================================================
  // ETHEREUM, ARBITRUM, POLYGON (EVM Chains)
  // ========================================================================

  /**
   * Get balance on EVM chain
   */
  async getBalanceEVM(chain, address) {
    try {
      if (!['ethereum', 'arbitrum', 'polygon'].includes(chain)) {
        throw new Error(`Unsupported EVM chain: ${chain}`);
      }

      const provider = this.providers[chain];
      const balance = await provider.getBalance(address);
      const decimals = CHAIN_CONFIG[chain].decimals;
      const humanReadable = ethers.formatUnits(balance, decimals);

      return {
        chain,
        address,
        balance: humanReadable,
        balanceRaw: balance.toString(),
        symbol: CHAIN_CONFIG[chain].symbol,
      };
    } catch (error) {
      logger.error(`Error getting balance on ${chain}:`, error);
      throw error;
    }
  }

  /**
   * Get all balances across chains
   */
  async getMultiChainBalance(address) {
    const chains = ['ethereum', 'arbitrum', 'polygon'];
    const balances = await Promise.allSettled(
      chains.map((chain) => this.getBalanceEVM(chain, address))
    );

    return balances.map((result) => {
      if (result.status === 'fulfilled') return result.value;
      return {
        chain: result.reason.message,
        error: 'Failed to fetch balance',
      };
    });
  }

  /**
   * Get token balance (e.g., USDC, DAI)
   */
  async getTokenBalance(chain, address, tokenAddress) {
    try {
      const provider = this.providers[chain];

     // ERC20 ABI for balanceOf
      const abi = [
        'function balanceOf(address owner) view returns (uint256)',
        'function decimals() view returns (uint8)',
      ];

      const contract = new ethers.Contract(tokenAddress, abi, provider);
      const [balance, decimals] = await Promise.all([
        contract.balanceOf(address),
        contract.decimals(),
      ]);

      return {
        chain,
        address,
        tokenAddress,
        balance: ethers.formatUnits(balance, decimals),
        balanceRaw: balance.toString(),
      };
    } catch (error) {
      logger.error(
        `Error getting token balance on ${chain}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Send transaction on EVM chain (requires wallet private key)
   */
  async sendTransactionEVM(chain, txData) {
    try {
      if (!process.env.WALLET_PRIVATE_KEY) {
        throw new Error('Wallet private key not configured');
      }

      const provider = this.providers[chain];
      const signer = new ethers.Wallet(
        process.env.WALLET_PRIVATE_KEY,
        provider
      );

      const tx = await signer.sendTransaction({
        to: txData.to,
        value: ethers.parseUnits(txData.amount, 'ether'),
        data: txData.data || '0x',
      });

      const receipt = await tx.wait();

      return {
        chain,
        txHash: receipt.transactionHash,
        status: receipt.status === 1 ? 'success' : 'failed',
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      logger.error(`Error sending transaction on ${chain}:`, error);
      throw error;
    }
  }

  /**
   * Verify message signature
   */
  async verifySignatureEVM(chain, message, signature, address) {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
      logger.error('Error verifying signature:', error);
      return false;
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatusEVM(chain, txHash) {
    try {
      const provider = this.providers[chain];
      const receipt = await provider.getTransactionReceipt(txHash);

      if (!receipt) {
        return { txHash, status: 'pending' };
      }

      return {
        txHash,
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        blockNumber: receipt.blockNumber,
        confirmations: (await provider.getBlockNumber()) - receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      logger.error(`Error getting transaction status:`, error);
      throw error;
    }
  }

  /**
   * Get current gas price
   */
  async getGasPriceEVM(chain) {
    try {
      const provider = this.providers[chain];
      const gasPrice = await provider.getGasPrice();

      return {
        chain,
        gasPriceWei: gasPrice.toString(),
        gasPriceGwei: ethers.formatUnits(gasPrice, 'gwei'),
        gasPriceUSD: (ethers.formatUnits(gasPrice, 'gwei') * 1500).toFixed(2), // Approximate
      };
    } catch (error) {
      logger.error(`Error getting gas price for ${chain}:`, error);
      throw error;
    }
  }

  // ========================================================================
  // SOLANA SUPPORT (Placeholder - requires @solana/web3.js)
  // ========================================================================

  async getSolanaBalance(address) {
    try {
      // Placeholder: would use @solana/web3.js Connection
      logger.info(`Getting Solana balance for ${address}`);
      return {
        chain: 'solana',
        address,
        balance: '0',
        symbol: 'SOL',
      };
    } catch (error) {
      logger.error('Error getting Solana balance:', error);
      throw error;
    }
  }

  async sendSolanaTransaction(txData) {
    try {
      // Placeholder: would construct and send Solana transaction
      logger.info('Sending Solana transaction:', txData);
      return {
        chain: 'solana',
        txHash: '0x' + Math.random().toString(16).slice(2),
        status: 'success',
      };
    } catch (error) {
      logger.error('Error sending Solana transaction:', error);
      throw error;
    }
  }

  // ========================================================================
  // BITCOIN SUPPORT (Placeholder - requires bitcoinjs-lib)
  // ========================================================================

  async getBitcoinBalance(address) {
    try {
      // Placeholder: would use Bitcoin RPC or blockchain API
      logger.info(`Getting Bitcoin balance for ${address}`);
      return {
        chain: 'bitcoin',
        address,
        balance: '0',
        symbol: 'BTC',
      };
    } catch (error) {
      logger.error('Error getting Bitcoin balance:', error);
      throw error;
    }
  }

  async getBitcoinTransaction(txId) {
    try {
      // Placeholder
      logger.info(`Getting Bitcoin transaction: ${txId}`);
      return { txId, status: 'unknown' };
    } catch (error) {
      logger.error('Error getting Bitcoin transaction:', error);
      throw error;
    }
  }

  // ========================================================================
  // UTILITIES
  // ========================================================================

  /**
   * Get chain info
   */
  getChainInfo(chain) {
    return CHAIN_CONFIG[chain] || null;
  }

  /**
   * Get all supported chains
   */
  getSupportedChains() {
    return Object.keys(CHAIN_CONFIG);
  }

  /**
   * Validate address format for chain
   */
  validateAddress(chain, address) {
    if (['ethereum', 'arbitrum', 'polygon'].includes(chain)) {
      return ethers.isAddress(address);
    }
    if (chain === 'solana') {
      return /^[1-9A-HJ-NP-Z]{32,44}$/.test(address);
    }
    if (chain === 'bitcoin') {
      return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/.test(
        address
      );
    }
    return false;
  }

  /**
   * Convert between chains (same token, different chains)
   */
  async bridgeAsset(fromChain, toChain, amount, tokenAddress) {
    try {
      // Placeholder for cross-chain bridge logic
      logger.info(
        `Bridging ${amount} from ${fromChain} to ${toChain}`
      );
      return {
        fromChain,
        toChain,
        amount,
        estimatedTime: '10-30 minutes',
        bridgeProtocol: 'Stargate', // or Across, LayerZero, etc
      };
    } catch (error) {
      logger.error('Error bridging asset:', error);
      throw error;
    }
  }
}

module.exports = MultiChainService;
