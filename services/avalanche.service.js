import { ethers } from 'ethers';
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

    /**
     * Obtiene el proveedor de Avalanche.
     */
    static getProvider() {
        return new ethers.providers.StaticJsonRpcProvider(this.AVAX_MAINNET_RPC);
    }

    /**
     * Verifica y obtiene la dirección en checksum.
     * @param {string} address
     */
    static getChecksumAddress(address) {
        try {
            return ethers.utils.getAddress(address);
        } catch (error) {
            throw new Error(`Invalid address format: ${error.message}`);
        }
    }

    /**
     * Encripta la private key.
     * @param {string} privateKey
     * @param {string} secretKey
     */
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

    /**
     * Desencripta la private key.
     * @param {Object} encryptedData
     * @param {string} secretKey
     */
    static decryptWallet(encryptedData, secretKey) {
        const iv = Buffer.from(encryptedData.iv, 'hex');
        const encryptedText = Buffer.from(encryptedData.content, 'hex');
        const key = Buffer.from(secretKey, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-ctr', key, iv);
        const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
        return decrypted.toString();
    }

    /**
     * Verifica si una dirección es válida.
     * @param {string} address
     */
    static isValidAddress(address) {
        try {
            ethers.utils.getAddress(address);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Crea una instancia de Wallet usando la private key.
     * @param {string} privateKey
     */
    static createWallet(privateKey) {
        try {
            return new ethers.Wallet(privateKey, this.getProvider());
        } catch (error) {
            throw new Error(`Invalid private key: ${error.message}`);
        }
    }

    /**
     * Obtiene el balance de AVAX para una dirección específica.
     * @param {string} address
     */
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

    /**
     * Obtiene el balance de un token ERC20 para una dirección específica.
     * @param {string} tokenAddress
     * @param {string} address
     */
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

    /**
     * Obtiene el precio de AVAX en USD usando Chainlink.
     */
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

    /**
     * Obtiene transferencias recientes de un token en la red Avalanche.
     * @param {string} tokenAddress
     * @param {number} blockCount
     */
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

    /**
     * Envía una transacción AVAX.
     * @param {string} privateKey
     * @param {string} to
     * @param {number} value
     * @param {string} data
     */
    static async sendTransaction(privateKey, to, value, data = '0x') {
        try {
            const wallet = this.createWallet(privateKey);
            const nonce = await wallet.getTransactionCount();
            const gasPrice = await wallet.provider.getGasPrice();
            const gasLimit = await wallet.estimateGas({
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
            const txResponse = await wallet.provider.sendTransaction(signedTx);
            return await txResponse.wait();
        } catch (error) {
            throw new Error(`Transaction failed: ${error.message}`);
        }
    }

    /**
     * Aprueba una cantidad específica de un token ERC20 para que un contrato pueda gastarlo.
     * @param {string} privateKey
     * @param {string} tokenAddress
     * @param {string} spenderAddress
     * @param {number} amount
     */
    static async approveToken(privateKey, tokenAddress, spenderAddress, amount) {
        try {
            const wallet = this.createWallet(privateKey);
            const provider = this.getProvider();
            const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet.connect(provider));
            const tx = await contract.approve(spenderAddress, ethers.utils.parseEther(amount.toString()));
            return await tx.wait();
        } catch (error) {
            throw new Error(`Token approval failed: ${error.message}`);
        }
    }

    /**
     * Transfiere una cantidad específica de un token ERC20 a otra dirección.
     * @param {string} privateKey
     * @param {string} tokenAddress
     * @param {string} recipientAddress
     * @param {number} amount
     */
    static async transferToken(privateKey, tokenAddress, recipientAddress, amount) {
        try {
            const wallet = this.createWallet(privateKey);
            const provider = this.getProvider();
            const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet.connect(provider));
            const tx = await contract.transfer(recipientAddress, ethers.utils.parseEther(amount.toString()));
            return await tx.wait();
        } catch (error) {
            throw new Error(`Token transfer failed: ${error.message}`);
        }
    }

    /**
     * Ejecuta un método de un contrato inteligente.
     * @param {string} privateKey
     * @param {string} contractAddress
     * @param {Array} abi
     * @param {string} methodName
     * @param {Array} params
     */
    static async executeContractMethod(privateKey, contractAddress, abi, methodName, params = []) {
        try {
            const wallet = this.createWallet(privateKey);
            const provider = this.getProvider();
            const contract = new ethers.Contract(contractAddress, abi, wallet.connect(provider));
            const tx = await contract[methodName](...params);
            return await tx.wait();
        } catch (error) {
            throw new Error(`Contract execution failed: ${error.message}`);
        }
    }

    /**
     * Estima el gas para una transacción.
     * @param {string} privateKey
     * @param {string} from
     * @param {string} to
     * @param {number} value
     * @param {string} data
     */
    static async estimateGasForTransaction(privateKey, from, to, value, data = '0x') {
        try {
            const wallet = this.createWallet(privateKey);
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

    /**
     * Obtiene el historial de transacciones para una dirección específica.
     * @param {string} address
     * @param {number} startBlock
     * @param {string} endBlock
     */
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

    /**
     * Obtiene información detallada sobre un bloque específico.
     * @param {string} privateKey
     * @param {string} blockNumber
     */
    static async getBlockInformation(privateKey, blockNumber = 'latest') {
        try {
            // La privateKey no es necesaria para leer información de bloques
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

    /**
     * Obtiene los últimos precios de diferentes DEXes.
     * @param {string} privateKey
     */
    static async getLatestPrices(privateKey) {
        try {
            // Implementa según la lógica de EthersService
            // Por ejemplo:
            const ethersService = new EthersService(privateKey);
            const latestPrices = await ethersService.getLatestPrices();
            return latestPrices;
        } catch (error) {
            throw new Error(`Error obtaining latest prices: ${error.message}`);
        }
    }
}

export default AvalancheService;
