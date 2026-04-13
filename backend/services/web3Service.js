const { ethers } = require('ethers');
const logger = require('../middleware/logger');
const { Web3Error } = require('../middleware/errors');

/**
 * Web3 Service for blockchain operations
 */

class Web3Service {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    this.signer = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY, this.provider);
    this.escrowContractAddress = process.env.ESCROW_CONTRACT_ADDRESS;
  }

  /**
   * Verify wallet signature
   */
  async verifySignature(address, message, signature) {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
      logger.error('Signature verification failed:', error);
      throw new Web3Error('Invalid signature');
    }
  }

  /**
   * Get wallet balance
   */
  async getBalance(address) {
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      logger.error('Failed to get balance:', error);
      throw new Web3Error('Failed to retrieve wallet balance');
    }
  }

  /**
   * Send transaction
   */
  async sendTransaction(to, amount) {
    try {
      const tx = await this.signer.sendTransaction({
        to,
        value: ethers.parseEther(amount.toString()),
      });
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      logger.error('Transaction failed:', error);
      throw new Web3Error('Transaction failed: ' + error.message);
    }
  }

  /**
   * Create escrow transaction
   */
  async createEscrow(buyerAddress, sellerAddress, amount, orderId) {
    try {
      // This is placeholder - actual implementation depends on your smart contract
      logger.info(`Creating escrow for order ${orderId}`);

      // In a real implementation, you would:
      // 1. Call your escrow smart contract
      // 2. Lock funds in escrow
      // 3. Return transaction hash

      return {
        transactionHash: '0x...',
        escrowId: `escrow_${orderId}`,
        status: 'pending',
      };
    } catch (error) {
      logger.error('Escrow creation failed:', error);
      throw new Web3Error('Failed to create escrow');
    }
  }

  /**
   * Release escrow funds
   */
  async releaseEscrow(escrowId, buyerAddress) {
    try {
      logger.info(`Releasing escrow ${escrowId}`);

      // In a real implementation, you would:
      // 1. Call your escrow smart contract
      // 2. Release funds to seller
      // 3. Return transaction hash

      return {
        transactionHash: '0x...',
        status: 'released',
      };
    } catch (error) {
      logger.error('Escrow release failed:', error);
      throw new Web3Error('Failed to release escrow');
    }
  }

  /**
   * Refund escrow
   */
  async refundEscrow(escrowId) {
    try {
      logger.info(`Refunding escrow ${escrowId}`);

      // In a real implementation, you would:
      // 1. Call your escrow smart contract
      // 2. Return funds to buyer
      // 3. Return transaction hash

      return {
        transactionHash: '0x...',
        status: 'refunded',
      };
    } catch (error) {
      logger.error('Escrow refund failed:', error);
      throw new Web3Error('Failed to refund escrow');
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(txHash) {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      if (!receipt) {
        return 'pending';
      }
      return receipt.status === 1 ? 'confirmed' : 'failed';
    } catch (error) {
      logger.error('Failed to get transaction status:', error);
      throw new Web3Error('Failed to retrieve transaction status');
    }
  }

  /**
   * Get token balance (for ERC-20 tokens)
   */
  async getTokenBalance(tokenAddress, walletAddress) {
    try {
      // Simplified ERC-20 ABI for balanceOf function
      const abi = ['function balanceOf(address) view returns (uint256)'];
      const contract = new ethers.Contract(tokenAddress, abi, this.provider);
      const balance = await contract.balanceOf(walletAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      logger.error('Failed to get token balance:', error);
      throw new Web3Error('Failed to retrieve token balance');
    }
  }

  /**
   * Monitor gas prices
   */
  async getGasPrice() {
    try {
      const feeData = await this.provider.getFeeData();
      return {
        gasPrice: ethers.formatUnits(feeData.gasPrice, 'gwei'),
        maxFeePerGas: ethers.formatUnits(feeData.maxFeePerGas, 'gwei'),
        maxPriorityFeePerGas: ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei'),
      };
    } catch (error) {
      logger.error('Failed to get gas price:', error);
      throw new Web3Error('Failed to retrieve gas price');
    }
  }

  /**
   * Validate Ethereum address
   */
  static validateAddress(address) {
    return ethers.isAddress(address);
  }

  /**
   * Format address for display
   */
  static formatAddress(address, chars = 6) {
    if (!ethers.isAddress(address)) {
      return address;
    }
    return `${address.substring(0, chars)}...${address.substring(address.length - chars)}`;
  }
}

// Export singleton instance
module.exports = new Web3Service();
