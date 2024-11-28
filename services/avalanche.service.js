import {ethers} from 'ethers';
import crypto from 'crypto';

// ABI for ERC20 token interface
const ERC20_ABI = [
	"function balanceOf(address owner) view returns (uint256)",
	"function decimals() view returns (uint8)",
	"function symbol() view returns (string)",
	"event Transfer(address indexed from, address indexed to, uint256 value)"
];

class AvalancheService {
	static CHAINLINK_AVAX_USD_FEED = "0x0A77230d17318075983913bC2145DB16C7366156";
	static AVAX_MAINNET_RPC = "https://api.avax.network/ext/bc/C/rpc";

	static getProvider() {
		return new ethers.providers.StaticJsonRpcProvider(this.AVAX_MAINNET_RPC);
	}

	static getChecksumAddress(address) {
		try {
			return ethers.utils.getAddress(address);
		} catch (error) {
			throw new Error(`Invalid address format: ${error.message}`);
		}
	}

	static encryptWallet(privateKey, secretKey) {
		const iv = crypto.randomBytes(16);
		const key = Buffer.from(secretKey, 'hex');
		const cipher = crypto.createCipheriv('aes-256-ctr', key, iv);
		const encrypted = Buffer.concat([cipher.update(privateKey), cipher.final()]);

		return {
			iv: iv.toString('hex'),
			content: encrypted.toString('hex')
		};
	}

	static decryptWallet(encryptedData, secretKey) {
		const iv = Buffer.from(encryptedData.iv, 'hex');
		const encryptedText = Buffer.from(encryptedData.content, 'hex');
		const key = Buffer.from(secretKey, 'hex');
		const decipher = crypto.createDecipheriv('aes-256-ctr', key, iv);
		const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
		return decrypted.toString();
	}

	static isValidAddress(address) {
		try {
			ethers.utils.getAddress(address);
			return true;
		} catch (error) {
			return false;
		}
	}

	static async getAvaxBalance(address) {
		try {
			const checksumAddress = this.getChecksumAddress(address);
			const provider = this.getProvider();
			const balance = await provider.getBalance(checksumAddress);
			return ethers.utils.formatEther(balance);
		} catch (error) {
			throw new Error(`Error getting AVAX balance: ${error.message}`);
		}
	}

	static async getTokenBalance(tokenAddress, address) {
		try {
			const checksumTokenAddress = this.getChecksumAddress(tokenAddress);
			const checksumAddress = this.getChecksumAddress(address);
			const provider = this.getProvider();
			const contract = new ethers.Contract(checksumTokenAddress, ERC20_ABI, provider);
			const balance = await contract.balanceOf(checksumAddress);
			const decimals = await contract.decimals();
			return ethers.utils.formatUnits(balance, decimals);
		} catch (error) {
			throw new Error(`Error getting token balance: ${error.message}`);
		}
	}

	static async getAvaxUsdPrice() {
		try {
			const provider = this.getProvider();
			const aggregator = new ethers.Contract(
				this.getChecksumAddress(this.CHAINLINK_AVAX_USD_FEED),
				["function latestAnswer() view returns (int256)"],
				provider
			);
			const price = await aggregator.latestAnswer();
			return Number(price) / 1e8;
		} catch (error) {
			throw new Error(`Error getting AVAX/USD price: ${error.message}`);
		}
	}

	static async getRecentTransfers(tokenAddress, blockCount = 1000) {
		try {
			const checksumTokenAddress = this.getChecksumAddress(tokenAddress);
			const provider = this.getProvider();
			const contract = new ethers.Contract(checksumTokenAddress, ERC20_ABI, provider);

			const currentBlock = await provider.getBlockNumber();
			const fromBlock = currentBlock - blockCount;

			const filter = contract.filters.Transfer();
			const events = await contract.queryFilter(filter, fromBlock);

			return events.map(event => ({
				from: this.getChecksumAddress(event.args[0]),
				to: this.getChecksumAddress(event.args[1]),
				value: ethers.utils.formatUnits(event.args[2], 18),
				transactionHash: event.transactionHash,
				blockNumber: event.blockNumber
			}));
		} catch (error) {
			throw new Error(`Error getting transfer history: ${error.message}`);
		}
	}

	static async sendTransaction(wallet, to, value, data = '0x') {
		try {
			const provider = this.getProvider();
			const nonce = await provider.getTransactionCount(wallet.address);
			const gasPrice = await provider.getGasPrice();
			const gasLimit = await provider.estimateGas({
				to,
				value: ethers.utils.parseEther(value.toString()),
				data
			});

			const tx = {
				nonce,
				gasPrice,
				gasLimit,
				to,
				value: ethers.utils.parseEther(value.toString()),
				data,
				chainId: 43114 // Avalanche C-Chain
			};

			const signedTx = await wallet.signTransaction(tx);
			const txResponse = await provider.sendTransaction(signedTx);
			return await txResponse.wait();
		} catch (error) {
			throw new Error(`Transaction failed: ${error.message}`);
		}
	}

	// Token Interactions
	static async approveToken(wallet, tokenAddress, spenderAddress, amount) {
		try {
			const provider = this.getProvider();
			const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet.connect(provider));
			const tx = await contract.approve(spenderAddress, ethers.utils.parseEther(amount.toString()));
			return await tx.wait();
		} catch (error) {
			throw new Error(`Token approval failed: ${error.message}`);
		}
	}

	static async transferToken(wallet, tokenAddress, recipientAddress, amount) {
		try {
			const provider = this.getProvider();
			const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet.connect(provider));
			const tx = await contract.transfer(recipientAddress, ethers.utils.parseEther(amount.toString()));
			return await tx.wait();
		} catch (error) {
			throw new Error(`Token transfer failed: ${error.message}`);
		}
	}

	// Contract Interaction
	static async executeContractMethod(wallet, contractAddress, abi, methodName, params = []) {
		try {
			const provider = this.getProvider();
			const contract = new ethers.Contract(contractAddress, abi, wallet.connect(provider));
			const tx = await contract[methodName](...params);
			return await tx.wait();
		} catch (error) {
			throw new Error(`Contract execution failed: ${error.message}`);
		}
	}

	// Gas Estimation
	static async estimateGasForTransaction(from, to, value, data = '0x') {
		try {
			const provider = this.getProvider();
			const gasLimit = await provider.estimateGas({
				from,
				to,
				value: ethers.utils.parseEther(value.toString()),
				data
			});
			const gasPrice = await provider.getGasPrice();

			return {
				gasLimit: gasLimit.toString(),
				gasPrice: ethers.utils.formatUnits(gasPrice, 'gwei'),
				estimatedCost: ethers.utils.formatEther(gasLimit.mul(gasPrice))
			};
		} catch (error) {
			throw new Error(`Gas estimation failed: ${error.message}`);
		}
	}

	// Transaction History
	static async getTransactionHistory(address, startBlock = 0, endBlock = 'latest') {
		try {
			const provider = this.getProvider();
			const checksumAddress = this.getChecksumAddress(address);

			// Get transactions
			const history = await provider.getHistory(checksumAddress, startBlock, endBlock);

			return history.map(tx => ({
				hash: tx.hash,
				from: tx.from,
				to: tx.to,
				value: ethers.utils.formatEther(tx.value),
				timestamp: tx.timestamp,
				gasUsed: tx.gasUsed?.toString(),
				gasPrice: tx.gasPrice ? ethers.utils.formatUnits(tx.gasPrice, 'gwei') : null,
				status: tx.status
			}));
		} catch (error) {
			throw new Error(`Error fetching transaction history: ${error.message}`);
		}
	}

	// Block Monitoring
	static async getBlockInformation(blockNumber = 'latest') {
		try {
			const provider = this.getProvider();
			const block = await provider.getBlock(blockNumber);
			return {
				number: block.number,
				timestamp: block.timestamp,
				hash: block.hash,
				parentHash: block.parentHash,
				gasUsed: block.gasUsed.toString(),
				gasLimit: block.gasLimit.toString(),
				transactions: block.transactions
			};
		} catch (error) {
			throw new Error(`Error fetching block information: ${error.message}`);
		}
	}
}

export default AvalancheService;
