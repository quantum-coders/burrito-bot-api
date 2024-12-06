import { ethers } from 'ethers';
import { pangolinRouter, sushiRouter, traderJoeRouterv1 } from '../data/abis/routers.js';
import { joeABI, pangolinPairABI, sushiPairABI } from '../data/abis/dexes.js';
import { erc20Abi } from '../data/abis/erc20.js';

class EthersService {
    /**
     * Constructor de EthersService.
     * @param {string} privateKey - Clave privada del usuario.
     */
    constructor(privateKey) {
        if (!privateKey) {
            throw new Error('Se requiere una clave privada para inicializar EthersService.');
        }
        this.provider = new ethers.providers.JsonRpcProvider(process.env.MAINNET_RPC_PROVIDER);
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        this.traderJoePair = new ethers.Contract(
            process.env.TRADER_JOE_PAIR_WETH_WAVAX_MAINNET,
            joeABI,
            this.provider
        );
        this.sushiPair = new ethers.Contract(
            process.env.SUSHISWAP_PAIR_WETH_WAVAX_MAINNET,
            sushiPairABI,
            this.provider
        );
        this.pangolinPair = new ethers.Contract(
            process.env.PANGOLIN_PAIR_WETH_WAVAX_MAINNET,
            pangolinPairABI,
            this.provider
        );
    }

    /**
     * Conecta una wallet usando una clave privada.
     * @param {string} privateKey - Clave privada para conectar.
     * @returns {string} Dirección de la wallet conectada.
     */
    async connectWallet(privateKey) {
        try {
            this.wallet = new ethers.Wallet(privateKey, this.provider);
            console.log(`🔐 Wallet conectada: ${this.wallet.address}`);
            return this.wallet.address;
        } catch (error) {
            console.error('Error conectando wallet:', error);
            throw new Error('Conexión de wallet fallida.');
        }
    }

    /**
     * Obtiene el balance en un bloque específico.
     * @param {string} address - Dirección blockchain.
     * @param {number|string} blockNumber - Número de bloque.
     * @returns {string} Balance en ETH/AVAX.
     */
    async getBalanceAtBlock(address, blockNumber) {
        try {
            const balance = await this.provider.getBalance(address, blockNumber);
            return ethers.utils.formatEther(balance);
        } catch (error) {
            console.error('Error obteniendo balance en bloque:', error);
            throw new Error('No se pudo obtener el balance.');
        }
    }

    /**
     * Obtiene el número actual de bloque.
     * @returns {number} Número de bloque.
     */
    async getBlockNumber() {
        try {
            return await this.provider.getBlockNumber();
        } catch (error) {
            console.error('Error obteniendo número de bloque:', error);
            throw new Error('No se pudo obtener el número de bloque.');
        }
    }

    /**
     * Calcula los amounts out en un exchange específico.
     * @param {string} tokenInAddress - Dirección del contrato del token de entrada.
     * @param {string} tokenOutAddress - Dirección del contrato del token de salida.
     * @param {number} amountIn - Cantidad de tokens de entrada.
     * @param {string} exchange - Nombre del exchange ('sushi', 'trader-joe', 'pangolin').
     * @returns {Array} Array de amounts out.
     */
    async getAmountsOut(tokenInAddress, tokenOutAddress, amountIn, exchange) {
        try {
            let routerAddress, routerAbi, swapFunctionName;
            switch (exchange) {
                case 'sushi':
                    routerAddress = process.env.SUSHISWAP_ROUTER_ADDRESS;
                    routerAbi = sushiRouter;
                    swapFunctionName = 'getAmountsOut';
                    break;
                case 'trader-joe':
                    routerAddress = process.env.TRADER_JOE_ROUTER_ADDRESS_V1;
                    routerAbi = traderJoeRouterv1;
                    swapFunctionName = 'getAmountsOut';
                    break;
                case 'pangolin':
                    routerAddress = process.env.PANGOLIN_ROUTER_ADDRESS;
                    routerAbi = pangolinRouter;
                    swapFunctionName = 'getAmountsOut';
                    break;
                default:
                    throw new Error(`Exchange ${exchange} no es soportado.`);
            }

            const contractRouter = new ethers.Contract(routerAddress, routerAbi, this.provider);
            const path = [tokenInAddress, tokenOutAddress];
            const amountInParsed = ethers.utils.parseEther(amountIn.toString());

            const amounts = await contractRouter[swapFunctionName](amountInParsed, path);
            console.log(`📈 Amounts out: ${ethers.utils.formatEther(amounts[1])}`);
            return amounts;
        } catch (error) {
            console.error('Error en getAmountsOut:', error);
            throw new Error('No se pudo calcular amounts out.');
        }
    }

    /**
     * Obtiene el balance de ETH/AVAX o un token ERC20.
     * @param {string} [address=null] - Dirección del contrato del token ERC20.
     * @returns {string} Balance en ETH/AVAX o ERC20.
     */
    async getBalance(address = null) {
        try {
            if (address) {
                const tokenContract = new ethers.Contract(address, erc20Abi, this.wallet);
                const balance = await tokenContract.balanceOf(this.wallet.address);
                return ethers.utils.formatEther(balance);
            }
            const balance = await this.wallet.getBalance();
            console.log(`💰 Balance: ${ethers.utils.formatEther(balance)} ETH/AVAX`);
            return ethers.utils.formatEther(balance);
        } catch (error) {
            console.error('Error obteniendo balance:', error);
            throw new Error('No se pudo obtener el balance.');
        }
    }

    /**
     * Aumenta la allowance de un token ERC20.
     * @param {string} tokenAddress - Dirección del contrato del token ERC20.
     * @param {string} spenderAddress - Dirección del contrato que gastará los tokens.
     * @param {number} amount - Cantidad de tokens a aprobar.
     * @returns {Object} Objeto con la transacción y la nueva allowance.
     */
    async approveToken(tokenAddress, spenderAddress, amount) {
        try {
            console.log(`✅ Aprobando ${amount} de ${tokenAddress} para ${spenderAddress}...`);
            const token = new ethers.Contract(tokenAddress, erc20Abi, this.wallet);
            const amountParsed = ethers.utils.parseEther(amount.toString());
            const txApprove = await token.approve(spenderAddress, amountParsed);
            const txReceipt = await txApprove.wait();
            const allowance = await token.allowance(this.wallet.address, spenderAddress);
            console.log(`📄 Transacción de aprobación confirmada: ${txReceipt.transactionHash}`);
            console.log(`🔓 Nueva allowance: ${ethers.utils.formatEther(allowance)} tokens`);
            return { txReceipt, allowance: ethers.utils.formatEther(allowance) };
        } catch (error) {
            console.error('Error en approveToken:', error);
            throw new Error('No se pudo aprobar el token.');
        }
    }

    /**
     * Transfiere tokens ERC20 a otra dirección.
     * @param {string} tokenAddress - Dirección del contrato del token ERC20.
     * @param {string} recipientAddress - Dirección del destinatario.
     * @param {number} amount - Cantidad de tokens a transferir.
     * @returns {Object} Objeto con la transacción.
     */
    async transferToken(tokenAddress, recipientAddress, amount) {
        try {
            console.log(`🔄 Transfiriendo ${amount} de ${tokenAddress} a ${recipientAddress}...`);
            const token = new ethers.Contract(tokenAddress, erc20Abi, this.wallet);
            const amountParsed = ethers.utils.parseEther(amount.toString());
            const txTransfer = await token.transfer(recipientAddress, amountParsed);
            const txReceipt = await txTransfer.wait();
            console.log(`📄 Transacción de transferencia confirmada: ${txReceipt.transactionHash}`);
            return { txReceipt };
        } catch (error) {
            console.error('Error en transferToken:', error);
            throw new Error('No se pudo transferir el token.');
        }
    }

    /**
     * Realiza un swap de tokens en un DEX específico.
     * @param {Object} params - Parámetros del swap.
     * @param {string} params.tokenInAddress - Dirección del contrato del token de entrada.
     * @param {string} params.tokenOutAddress - Dirección del contrato del token de salida.
     * @param {number} params.amountIn - Cantidad de tokens de entrada.
     * @param {number} params.amountOut - Cantidad mínima de tokens de salida esperada.
     * @param {string} params.exchange - Nombre del exchange ('sushi', 'trader-joe', 'pangolin').
     * @param {number} [params.slippage=0.001] - Porcentaje de deslizamiento permitido.
     * @returns {Object} Objeto con la transacción.
     */
    async swapTokens({ tokenInAddress, tokenOutAddress, amountIn, amountOut, exchange, slippage = 0.001 }) {
        try {
            console.log(`🔁 Realizando swap en ${exchange}: ${amountIn} de ${tokenInAddress} por al menos ${amountOut} de ${tokenOutAddress} con slippage de ${(slippage * 100).toFixed(2)}%...`);

            let routerAddress, routerAbi, swapFunctionName;
            switch (exchange) {
                case 'sushi':
                    routerAddress = process.env.SUSHISWAP_ROUTER_ADDRESS;
                    routerAbi = sushiRouter;
                    swapFunctionName = 'swapExactETHForTokens';
                    break;
                case 'trader-joe':
                    routerAddress = process.env.TRADER_JOE_ROUTER_ADDRESS_V1;
                    routerAbi = traderJoeRouterv1;
                    swapFunctionName = 'swapExactAVAXForTokens';
                    break;
                case 'pangolin':
                    routerAddress = process.env.PANGOLIN_ROUTER_ADDRESS;
                    routerAbi = pangolinRouter;
                    swapFunctionName = 'swapExactAVAXForTokens';
                    break;
                default:
                    throw new Error(`Exchange ${exchange} no es soportado.`);
            }

            const contractRouter = new ethers.Contract(routerAddress, routerAbi, this.wallet);
            const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutos desde ahora
            const path = [tokenInAddress, tokenOutAddress];
            const amountInParsed = ethers.utils.parseEther(amountIn.toString());
            const amountOutMin = ethers.utils.parseEther(amountOut.toString());

            // Aprobar el token si no es nativo (ETH/AVAX)
            const isNativeIn = (tokenInAddress.toLowerCase() === ethers.constants.AddressZero.toLowerCase());
            if (!isNativeIn) {
                await this.approveToken(tokenInAddress, routerAddress, amountIn);
            }

            // Estimar gas
            const estimatedGas = await contractRouter.estimateGas[swapFunctionName](
                amountOutMin,
                amountInParsed,
                path,
                this.wallet.address,
                deadline,
                {
                    value: isNativeIn ? amountInParsed : 0,
                }
            );
            const gasLimit = estimatedGas.add(estimatedGas.mul(10).div(100)); // Añadir un 10% extra

            // Realizar el swap
            const tx = await contractRouter[swapFunctionName](
                amountOutMin,
                amountInParsed,
                path,
                this.wallet.address,
                deadline,
                {
                    gasLimit: gasLimit,
                    value: isNativeIn ? amountInParsed : 0,
                }
            );

            const receipt = await tx.wait();
            console.log(`✅ Swap confirmado: ${receipt.transactionHash}`);
            return { txReceipt: receipt };
        } catch (error) {
            console.error('❌ Error en swapTokens:', error);
            throw new Error('No se pudo realizar el swap.');
        }
    }

    /**
     * Obtiene las reservas y precios de un par en un DEX.
     * @param {Object} pair - Contrato del par.
     * @returns {Object} Precios calculados.
     */
    async getReservesAndPrices(pair) {
        try {
            const reserves = await pair.getReserves();
            const reserveAVAX = ethers.utils.formatUnits(reserves[0], 'wei');
            const reserveWETH = ethers.utils.formatUnits(reserves[1], 'wei');
            const priceAVAXinWETH = Number(reserveWETH) / Number(reserveAVAX);
            const priceWETHinAVAX = Number(reserveAVAX) / Number(reserveWETH);
            return { priceAVAXinWETH, priceWETHinAVAX };
        } catch (error) {
            console.error('Error en getReservesAndPrices:', error);
            throw new Error('No se pudieron obtener las reservas y precios.');
        }
    }

    /**
     * Obtiene los últimos precios de diferentes DEXes.
     * @returns {Object} Precios de DEXes.
     */
    async getLatestPrices() {
        try {
            const dexPairs = [this.traderJoePair, this.pangolinPair, this.sushiPair];
            const dexNames = ['trader-joe', 'pangolin', 'sushi'];
            const prices = await Promise.all(dexPairs.map((pair, index) =>
                this.getReservesAndPrices(pair).then(({ priceAVAXinWETH, priceWETHinAVAX }) => ({
                    dex: dexNames[index],
                    priceAvax: priceAVAXinWETH,
                    priceWeth: priceWETHinAVAX,
                }))
            ));

            // Ordenar precios de mayor a menor
            prices.sort((a, b) => b.priceAvax - a.priceAvax);
            const highestPriceDex = prices[0];
            const lowestPriceDex = prices[prices.length - 1];
            const percentageDifference = ((highestPriceDex.priceAvax - lowestPriceDex.priceAvax) / lowestPriceDex.priceAvax) * 100;

            console.log(`📊 Mayor precio: ${highestPriceDex.dex} con ${highestPriceDex.priceAvax} AVAX.`);
            console.log(`📉 Menor precio: ${lowestPriceDex.dex} con ${lowestPriceDex.priceAvax} AVAX.`);
            console.log(`📈 Diferencia porcentual: ${percentageDifference.toFixed(2)}%`);

            return {
                traderJoePrice: prices.find(p => p.dex === 'trader-joe'),
                pangolinPrice: prices.find(p => p.dex === 'pangolin'),
                sushiPrice: prices.find(p => p.dex === 'sushi'),
                highestPriceDex,
                lowestPriceDex,
                percentageDifference: percentageDifference.toFixed(2),
            };
        } catch (error) {
            console.error('Error en getLatestPrices:', error);
            throw new Error('No se pudieron obtener los últimos precios.');
        }
    }

    /**
     * Obtiene información detallada sobre un bloque específico.
     * @param {string|number} [blockNumber='latest'] - Número de bloque.
     * @returns {Object} Información del bloque.
     */
    async getBlockInformation(blockNumber = 'latest') {
        try {
            const block = await this.provider.getBlock(blockNumber);
            return {
                number: block.number,
                timestamp: block.timestamp,
                hash: block.hash,
                parentHash: block.parentHash,
                gasUsed: block.gasUsed.toString(),
                gasLimit: block.gasLimit.toString(),
                transactions: block.transactions,
            };
        } catch (error) {
            console.error('Error en getBlockInformation:', error);
            throw new Error('No se pudo obtener la información del bloque.');
        }
    }
}

export { EthersService };
export default FunctionService;
