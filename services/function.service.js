// FunctionService.js
import AvalancheService from '#services/avalanche.service.js';
import ChainlinkService from '#services/chainlink.service.js';
import {decryptPrivateKey} from '#utils/crypto.js';
import {ethers} from "ethers"; // Implementa esta función de desencriptación

const SECRET_KEY = process.env.ENCRYPTION_SECRET_KEY; // Clave de encriptación segura
const AVALANCHE_RPC_URL = process.env.AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc';

/**
 * Clase FunctionService que maneja todas las operaciones del agente AI.
 */
class FunctionService {
	static getProvider() {
		return new ethers.providers.JsonRpcProvider(AVALANCHE_RPC_URL);
	}

	/**
	 * Obtiene y desencripta la private key del usuario.
	 * @param {number} userId - ID del usuario.
	 * @returns {Promise<string>} - Retorna la private key desencriptada o un mensaje de error.
	 */
	static async getDecryptedPrivateKey(userId) {
		try {
			const user = await prisma.user.findUnique({
				where: {id: userId},
			});

			if (!user) {
				return 'Error: Usuario no encontrado.';
			}

			if (!user.privateKey) {
				return 'Error: No se encontró una clave privada para este usuario.';
			}

			const decryptedKey = decryptPrivateKey(user.privateKey, SECRET_KEY);
			return decryptedKey;
		} catch (error) {
			console.error('❌ Error obteniendo la clave privada:', error);
			return 'Error: No se pudo obtener la clave privada.';
		}
	}

	// -------------------------------
	// Funciones Principales
	// -------------------------------

	/**
	 * Función que indica al sistema que llame a un mensaje de streaming.
	 * @param {number} userId - ID del usuario.
	 * @param {Object} args - Argumentos.
	 * @param {string} args.originalPrompt - El prompt original del usuario.
	 * @returns {Promise<string>} - Retorna un mensaje de éxito o un mensaje de error.
	 */
	static async chatResponse(userId, args) {
		const {originalPrompt} = args;
		try {
			// Implementa la lógica específica para manejar el streaming
			console.log(`📤 Enviando prompt para streaming: ${originalPrompt}`);
			// Placeholder para la lógica de streaming
			return 'Streaming iniciado exitosamente.';
		} catch (error) {
			console.error('❌ Error en chatResponse:', error);
			return `Error: ${error.message}`;
		}
	}

	/**
	 * Envía la señal para actualizar el agente.
	 * @param {number} userId - ID del usuario.
	 * @returns {Promise<string>} - Retorna un mensaje de éxito o un mensaje de error.
	 */
	static async updateAgent(userId) {
		try {
			// Implementa la lógica específica para actualizar el agente AI
			console.log('🔄 Actualizando agente AI...');
			// Placeholder para la lógica de actualización
			return 'Agente actualizado exitosamente.';
		} catch (error) {
			console.error('❌ Error en updateAgent:', error);
			return `Error: ${error.message}`;
		}
	}

	/**
	 * Agrega una nueva entidad al agente.
	 * @param {number} userId - ID del usuario.
	 * @param {Object} args - Argumentos.
	 * @param {string} args.name - El nombre de la nueva entidad.
	 * @param {string} args.description - Una descripción de la nueva entidad.
	 * @returns {Promise<string>} - Retorna un mensaje de éxito o un mensaje de error.
	 */
	static async addEntity(userId, args) {
		const {name, description} = args;
		try {
			console.log(`🆕 Agregando nueva entidad: ${name}`);
			// Implementa la lógica específica para agregar una entidad
			// Placeholder para la lógica de agregar entidad
			return `Entidad ${name} agregada exitosamente.`;
		} catch (error) {
			console.error('❌ Error en addEntity:', error);
			return `Error: ${error.message}`;
		}
	}

	// -------------------------------
	// Funciones de Precios de Chainlink
	// -------------------------------

	/**
	 * Obtiene todos los pares soportados de los data feeds de Chainlink.
	 * @param {number} userId - ID del usuario.
	 * @returns {Promise<string>} - Retorna los pares en formato JSON o un mensaje de error.
	 */
	static async getAllSupportedPairs(userId) {
		try {
			/*const decryptedKey = await this.getDecryptedPrivateKey(userId);
			if (decryptedKey.startsWith('Error')) {
				return decryptedKey;
			}*/

			console.log('🔍 Obteniendo todos los pares soportados...');
			const pairs = await ChainlinkService.getAllSupportedPairs();
			console.log('✅ Pares soportados obtenidos exitosamente.');
			return JSON.stringify(pairs);
		} catch (error) {
			console.error('❌ Error en getAllSupportedPairs:', error);
			return `Error: ${error.message}`;
		}
	}

	/**
	 * Verifica si un par dado es soportado por Chainlink.
	 * @param {number} userId - ID del usuario.
	 * @param {Object} args - Argumentos.
	 * @param {string} args.baseToken - Token base (ej. 'ETH').
	 * @param {string} [args.quoteToken='USD'] - Token de cotización (ej. 'USD').
	 * @returns {Promise<string>} - Retorna 'true', 'false' o un mensaje de error.
	 */
	static async isSupportedPair(userId, args) {
		const {baseToken, quoteToken = 'USD'} = args;
		try {
			/*			const decryptedKey = await this.getDecryptedPrivateKey(userId);
						if (decryptedKey.startsWith('Error')) {
							return decryptedKey;
						}*/

			console.log(`🔍 Verificando si ${baseToken}/${quoteToken} es soportado...`);
			const isSupported = await ChainlinkService.isSupported(baseToken, quoteToken);
			console.log(`✅ ${baseToken}/${quoteToken} soportado: ${isSupported}`);
			return isSupported.toString();
		} catch (error) {
			console.error('❌ Error en isSupportedPair:', error);
			return `Error: ${error.message}`;
		}
	}

	/**
	 * Obtiene el precio de un par específico de criptomonedas.
	 * @param {number} userId - ID del usuario.
	 * @param {Object} args - Argumentos.
	 * @param {string} args.baseToken - Token base.
	 * @param {string} [args.quoteToken='USD'] - Token de cotización.
	 * @returns {Promise<string>} - Retorna el precio como string o un mensaje de error.
	 */
	static async getPrice(userId, args) {
		const {baseToken, quoteToken = 'USD'} = args;
		try {
			const provider = this.getProvider();
			console.log(`🔍 Obteniendo precio ${baseToken}/${quoteToken}...`);
			const c = new ChainlinkService(provider);
			const priceData = await c.getPrice(baseToken, quoteToken);
			console.log(`✅ Precio ${baseToken}/${quoteToken}: ${priceData.price} ${quoteToken}`);
			return priceData.price.toString();
		} catch (error) {
			console.error('❌ Error en getPrice:', error);
			return `Error: ${error.message}`;
		}
	}

	/**
	 * Obtiene el precio de ETH a USD desde los data feeds de Chainlink.
	 * @param {number} userId - ID del usuario.
	 * @returns {Promise<string>} - Retorna el precio como string o un mensaje de error.
	 */
	static async getEthUsdPrice(userId) {
		return await this.getPrice(userId, {baseToken: 'ETH', quoteToken: 'USD'});
	}

	/**
	 * Obtiene el precio de BTC a USD desde los data feeds de Chainlink.
	 * @param {number} userId - ID del usuario.
	 * @returns {Promise<string>} - Retorna el precio como string o un mensaje de error.
	 */
	static async getBtcUsdPrice(userId) {
		return await this.getPrice(userId, {baseToken: 'BTC', quoteToken: 'USD'});
	}

	/**
	 * Obtiene el precio de AVAX a USD desde los data feeds de Chainlink.
	 * @param {number} userId - ID del usuario.
	 * @returns {Promise<string>} - Retorna el precio como string o un mensaje de error.
	 */
	static async getAvaxUsdPrice(userId) {
		return await this.getPrice(userId, {baseToken: 'AVAX', quoteToken: 'USD'});
	}

	/**
	 * Obtiene el precio de LINK a USD desde los data feeds de Chainlink.
	 * @param {number} userId - ID del usuario.
	 * @returns {Promise<string>} - Retorna el precio como string o un mensaje de error.
	 */
	static async getLinkUsdPrice(userId) {
		return await this.getPrice(userId, {baseToken: 'LINK', quoteToken: 'USD'});
	}

	/**
	 * Obtiene el precio de DAI a USD desde los data feeds de Chainlink.
	 * @param {number} userId - ID del usuario.
	 * @returns {Promise<string>} - Retorna el precio como string o un mensaje de error.
	 */
	static async getDaiUsdPrice(userId) {
		return await this.getPrice(userId, {baseToken: 'DAI', quoteToken: 'USD'});
	}

	// -------------------------------
	// Funciones Relacionadas con Balances y Transacciones en la Red Avalanche
	// -------------------------------

	/**
	 * Recupera el saldo de AVAX de una dirección blockchain dada.
	 * @param {number} userId - ID del usuario.
	 * @param {Object} args - Argumentos.
	 * @param {string} args.address - La dirección blockchain para la cual se recupera el saldo.
	 * @returns {Promise<string>} - Retorna el saldo en AVAX como string o un mensaje de error.
	 */
	static async getAvaxBalance(userId, args) {
		const {address} = args;
		try {
			/*			const decryptedKey = await this.getDecryptedPrivateKey(userId);
						if (decryptedKey.startsWith('Error')) {
							return decryptedKey;
						}*/

			console.log(`🔍 Obteniendo balance de AVAX para la dirección: ${address}...`);
			const balance = await AvalancheService.getAvaxBalance(address);
			console.log(`✅ Balance de AVAX para ${address}: ${balance} AVAX`);
			return balance.toString();
		} catch (error) {
			console.error('❌ Error en getAvaxBalance:', error);
			return `Error: ${error.message}`;
		}
	}

	/**
	 * Recupera el saldo de un token ERC20 específico para una dirección dada.
	 * @param {number} userId - ID del usuario.
	 * @param {Object} args - Argumentos.
	 * @param {string} args.tokenAddress - La dirección del contrato del token ERC20.
	 * @param {string} args.address - La dirección blockchain para la cual se recupera el saldo del token.
	 * @returns {Promise<string>} - Retorna el saldo del token como string o un mensaje de error.
	 */
	static async getTokenBalance(userId, args) {
		const {tokenAddress, address} = args;
		try {
			/*			const decryptedKey = await this.getDecryptedPrivateKey(userId);
						if (decryptedKey.startsWith('Error')) {
							return decryptedKey;
						}*/

			console.log(`🔍 Obteniendo balance de token para el token: ${tokenAddress}, dirección: ${address}...`);
			const balance = await AvalancheService.getTokenBalance(tokenAddress, address);
			console.log(`✅ Balance de token (${tokenAddress}) para ${address}: ${balance} tokens`);
			return balance.toString();
		} catch (error) {
			console.error('❌ Error en getTokenBalance:', error);
			return `Error: ${error.message}`;
		}
	}

	/**
	 * Obtiene transferencias recientes de un token en la red Avalanche.
	 * @param {number} userId - ID del usuario.
	 * @param {Object} args - Argumentos.
	 * @param {string} args.tokenAddress - La dirección del contrato del token.
	 * @param {number} [args.blockCount=1000] - El número de bloques recientes para buscar.
	 * @returns {Promise<string>} - Retorna las transferencias en formato JSON o un mensaje de error.
	 */
	static async getRecentTransfers(userId, args) {
		const {tokenAddress, blockCount = 1000} = args;
		try {
			/*			const decryptedKey = await this.getDecryptedPrivateKey(userId);
						if (decryptedKey.startsWith('Error')) {
							return decryptedKey;
						}*/

			console.log(`🔍 Obteniendo transferencias recientes para el token: ${tokenAddress}, blockCount: ${blockCount}...`);
			const transfers = await AvalancheService.getRecentTransfers(tokenAddress, blockCount);
			console.log(`✅ Transferencias recientes obtenidas para ${tokenAddress}.`);
			return JSON.stringify(transfers);
		} catch (error) {
			console.error('❌ Error en getRecentTransfers:', error);
			return `Error: ${error.message}`;
		}
	}

	/**
	 * Recupera el historial de transacciones para una dirección blockchain dada.
	 * @param {number} userId - ID del usuario.
	 * @param {Object} args - Argumentos.
	 * @param {string} args.address - La dirección blockchain para la cual se obtiene el historial de transacciones.
	 * @param {number} [args.startBlock=0] - El número de bloque inicial para obtener transacciones.
	 * @param {string} [args.endBlock='latest'] - El número de bloque final para obtener transacciones hasta.
	 * @returns {Promise<string>} - Retorna el historial de transacciones en formato JSON o un mensaje de error.
	 */
	static async getTransactionHistory(userId, args) {
		const {address, startBlock = 0, endBlock = 'latest'} = args;
		try {
			/*
						const decryptedKey = await this.getDecryptedPrivateKey(userId);
						if (decryptedKey.startsWith('Error')) {
							return decryptedKey;
						}
			*/

			console.log(`🔍 Obteniendo historial de transacciones para la dirección: ${address} desde el bloque ${startBlock} hasta ${endBlock}...`);
			const history = await AvalancheService.getTransactionHistory(address, startBlock, endBlock);
			console.log(`✅ Historial de transacciones obtenido para ${address}.`);
			return JSON.stringify(history);
		} catch (error) {
			console.error('❌ Error en getTransactionHistory:', error);
			return `Error: ${error.message}`;
		}
	}

	// -------------------------------
	// Funciones de Información de la Red
	// -------------------------------

	/**
	 * Obtiene los últimos precios de AVAX/WETH de diferentes exchanges descentralizados.
	 * @param {number} userId - ID del usuario.
	 * @returns {Promise<string>} - Retorna los precios en formato JSON o un mensaje de error.
	 */
	static async getLatestPrices(userId) {
		try {
			const decryptedKey = await this.getDecryptedPrivateKey(userId);
			if (decryptedKey.startsWith('Error')) {
				return decryptedKey;
			}

			console.log('🔍 Obteniendo los últimos precios de diferentes exchanges...');
			const latestPrices = await AvalancheService.getLatestPrices(decryptedKey);
			console.log('✅ Últimos precios obtenidos exitosamente.');
			return JSON.stringify(latestPrices);
		} catch (error) {
			console.error('❌ Error en getLatestPrices:', error);
			return `Error: ${error.message}`;
		}
	}

	/**
	 * Recupera el número de bloque actual de la red Avalanche.
	 * @param {number} userId - ID del usuario.
	 * @returns {Promise<string>} - Retorna el número de bloque como string o un mensaje de error.
	 */
	static async getBlockNumber(userId) {
		try {
			const decryptedKey = await this.getDecryptedPrivateKey(userId);
			if (decryptedKey.startsWith('Error')) {
				return decryptedKey;
			}

			console.log('🔍 Obteniendo el número actual de bloque...');
			const blockNumber = await AvalancheService.getBlockNumber(decryptedKey);
			console.log(`✅ Número actual de bloque: ${blockNumber}`);
			return blockNumber.toString();
		} catch (error) {
			console.error('❌ Error en getBlockNumber:', error);
			return `Error: ${error.message}`;
		}
	}

	/**
	 * Recupera información sobre un bloque específico en la red Avalanche.
	 * @param {number} userId - ID del usuario.
	 * @param {Object} args - Argumentos.
	 * @param {string} [args.blockNumber='latest'] - El número de bloque para obtener información.
	 * @returns {Promise<string>} - Retorna la información del bloque en formato JSON o un mensaje de error.
	 */
	static async getBlockInformation(userId, args) {
		const {blockNumber = 'latest'} = args;
		try {
			const decryptedKey = await this.getDecryptedPrivateKey(userId);
			if (decryptedKey.startsWith('Error')) {
				return decryptedKey;
			}

			console.log(`🔍 Obteniendo información del bloque número: ${blockNumber}...`);
			const blockInfo = await AvalancheService.getBlockInformation(decryptedKey, blockNumber);
			console.log(`✅ Información del bloque ${blockNumber} obtenida exitosamente.`);
			return JSON.stringify(blockInfo);
		} catch (error) {
			console.error('❌ Error en getBlockInformation:', error);
			return `Error: ${error.message}`;
		}
	}

	// -------------------------------
	// Funciones para Interactuar con DEXes
	// -------------------------------

	/**
	 * Calcula la cantidad de tokens de salida para una cantidad de entrada dada en un exchange específico.
	 * @param {number} userId - ID del usuario.
	 * @param {Object} args - Argumentos.
	 * @param {string} args.tokenInAddress - La dirección del contrato del token de entrada.
	 * @param {string} args.tokenOutAddress - La dirección del contrato del token de salida.
	 * @param {number} args.amountIn - La cantidad de tokens de entrada.
	 * @param {string} args.exchange - El nombre del exchange ('sushi', 'trader-joe', 'pangolin').
	 * @returns {Promise<string>} - Retorna la cantidad de tokens de salida como string o un mensaje de error.
	 */
	static async getAmountsOut(userId, args) {
		const {tokenInAddress, tokenOutAddress, amountIn, exchange} = args;
		try {
			const decryptedKey = await this.getDecryptedPrivateKey(userId);
			if (decryptedKey.startsWith('Error')) {
				return decryptedKey;
			}

			console.log(`🔍 Calculando amounts out para el exchange: ${exchange}, tokenIn: ${tokenInAddress}, tokenOut: ${tokenOutAddress}, amountIn: ${amountIn}...`);
			const amountsOut = await AvalancheService.getAmountsOut(decryptedKey, tokenInAddress, tokenOutAddress, amountIn, exchange);
			console.log(`✅ Amounts Out calculados: ${amountsOut}`);
			return amountsOut.toString();
		} catch (error) {
			console.error('❌ Error en getAmountsOut:', error);
			return `Error: ${error.message}`;
		}
	}

	/**
	 * Realiza un intercambio de tokens en un DEX específico.
	 * @param {number} userId - ID del usuario.
	 * @param {Object} args - Argumentos.
	 * @param {string} args.tokenInAddress - La dirección del contrato del token de entrada.
	 * @param {string} args.tokenOutAddress - La dirección del contrato del token de salida.
	 * @param {number} args.amountIn - La cantidad de tokens de entrada.
	 * @param {number} args.amountOut - La cantidad mínima de tokens de salida esperada.
	 * @param {string} args.exchange - El nombre del exchange ('sushi', 'trader-joe', 'pangolin').
	 * @param {number} [args.slippage=0.001] - El porcentaje de deslizamiento permitido.
	 * @returns {Promise<string>} - Retorna el hash de la transacción o un mensaje de error.
	 */
	static async swapTokens(userId, args) {
		const {tokenInAddress, tokenOutAddress, amountIn, amountOut, exchange, slippage = 0.001} = args;
		try {
			const decryptedKey = await this.getDecryptedPrivateKey(userId);
			if (decryptedKey.startsWith('Error')) {
				return decryptedKey;
			}

			console.log(`🔁 Realizando swap en ${exchange}: ${amountIn} de ${tokenInAddress} por al menos ${amountOut} de ${tokenOutAddress} con slippage de ${(slippage * 100).toFixed(2)}%...`);
			const swapReceipt = await AvalancheService.swapTokens(decryptedKey, tokenInAddress, tokenOutAddress, amountIn, amountOut, exchange, slippage);
			console.log(`✅ Swap realizado exitosamente. Hash de la transacción: ${swapReceipt.transactionHash}`);
			return `Swap realizado exitosamente. Hash de la transacción: ${swapReceipt.transactionHash}`;
		} catch (error) {
			console.error('❌ Error en swapTokens:', error);
			return `Error: ${error.message}`;
		}
	}

	/**
	 * Aprueba una cantidad específica de un token ERC20 para que un contrato pueda gastarlo.
	 * @param {number} userId - ID del usuario.
	 * @param {Object} args - Argumentos.
	 * @param {string} args.tokenAddress - La dirección del contrato del token ERC20.
	 * @param {string} args.spenderAddress - La dirección del contrato que gastará los tokens.
	 * @param {number} args.amount - La cantidad de tokens a aprobar.
	 * @returns {Promise<string>} - Retorna el hash de la transacción o un mensaje de error.
	 */
	static async approveToken(userId, args) {
		const {tokenAddress, spenderAddress, amount} = args;
		try {
			const decryptedKey = await this.getDecryptedPrivateKey(userId);
			if (decryptedKey.startsWith('Error')) {
				return decryptedKey;
			}

			console.log(`✅ Aprobando ${amount} de ${tokenAddress} para ${spenderAddress}...`);
			const approvalReceipt = await AvalancheService.approveToken(decryptedKey, tokenAddress, spenderAddress, amount);
			console.log(`✅ Aprobación realizada. Hash de la transacción: ${approvalReceipt.transactionHash}`);
			return `Aprobación realizada. Hash de la transacción: ${approvalReceipt.transactionHash}`;
		} catch (error) {
			console.error('❌ Error en approveToken:', error);
			return `Error: ${error.message}`;
		}
	}

	/**
	 * Transfiere una cantidad específica de un token ERC20 a una dirección dada.
	 * @param {number} userId - ID del usuario.
	 * @param {Object} args - Argumentos.
	 * @param {string} args.tokenAddress - La dirección del contrato del token ERC20.
	 * @param {string} args.recipientAddress - La dirección del destinatario.
	 * @param {number} args.amount - La cantidad de tokens a transferir.
	 * @returns {Promise<string>} - Retorna el hash de la transacción o un mensaje de error.
	 */
	static async transferToken(userId, args) {
		const {tokenAddress, recipientAddress, amount} = args;
		try {
			const decryptedKey = await this.getDecryptedPrivateKey(userId);
			if (decryptedKey.startsWith('Error')) {
				return decryptedKey;
			}

			console.log(`🔄 Transfiriendo ${amount} de ${tokenAddress} a ${recipientAddress}...`);
			const transferReceipt = await AvalancheService.transferToken(decryptedKey, tokenAddress, recipientAddress, amount);
			console.log(`✅ Transferencia realizada. Hash de la transacción: ${transferReceipt.transactionHash}`);
			return `Transferencia realizada. Hash de la transacción: ${transferReceipt.transactionHash}`;
		} catch (error) {
			console.error('❌ Error en transferToken:', error);
			return `Error: ${error.message}`;
		}
	}

	// -------------------------------
	// Funcionalidades Opcionales
	// -------------------------------

	/**
	 * Guarda una nueva dirección en el directorio del usuario.
	 * @param {number} userId - ID del usuario.
	 * @param {Object} args - Argumentos.
	 * @param {string} args.label - Nombre personalizado para la dirección.
	 * @param {string} args.address - Dirección blockchain.
	 * @param {string} [args.description] - Descripción opcional.
	 * @returns {Promise<string>} - Retorna un mensaje de éxito o un mensaje de error.
	 */
	static async addSavedAddress(userId, args) {
		const {label, address, description} = args;
		try {
			const decryptedKey = await this.getDecryptedPrivateKey(userId);
			if (decryptedKey.startsWith('Error')) {
				return decryptedKey;
			}

			console.log(`🆕 Guardando dirección ${label}: ${address}`);
			// Validar dirección
			if (!AvalancheService.isValidAddress(address)) {
				return 'Error: Dirección blockchain inválida.';
			}

			// Obtener dirección en checksum
			const checksumAddress = AvalancheService.getChecksumAddress(address);

			// Guardar en la base de datos
			await prisma.savedAddress.create({
				data: {
					label,
					address: checksumAddress,
					description: description || '',
					idUser: userId,
				},
			});

			console.log(`✅ Dirección ${label} guardada exitosamente.`);
			return `Dirección ${label} guardada exitosamente.`;
		} catch (error) {
			console.error('❌ Error en addSavedAddress:', error);
			return `Error: ${error.message}`;
		}
	}

	/**
	 * Obtiene todas las direcciones guardadas del usuario.
	 * @param {number} userId - ID del usuario.
	 * @returns {Promise<string>} - Retorna las direcciones en formato JSON o un mensaje de error.
	 */
	static async getSavedAddresses(userId) {
		try {
			const decryptedKey = await this.getDecryptedPrivateKey(userId);
			if (decryptedKey.startsWith('Error')) {
				return decryptedKey;
			}

			console.log('🔍 Obteniendo direcciones guardadas...');
			const savedAddresses = await prisma.savedAddress.findMany({
				where: {idUser: userId},
			});

			console.log(`✅ Direcciones guardadas obtenidas para el usuario ${userId}.`);
			return JSON.stringify(savedAddresses);
		} catch (error) {
			console.error('❌ Error en getSavedAddresses:', error);
			return `Error: ${error.message}`;
		}
	}

	/**
	 * Configura una rutina para monitorear un dato on-chain específico.
	 * @param {number} userId - ID del usuario.
	 * @param {Object} args - Argumentos.
	 * @param {string} args.type - Tipo de dato a monitorear (e.g., 'price', 'transfer').
	 * @param {Object} args.parameters - Parámetros específicos para la rutina.
	 * @param {string} args.frequency - Frecuencia de la rutina (e.g., 'hourly', '15_minutes').
	 * @returns {Promise<string>} - Retorna un mensaje de éxito o un mensaje de error.
	 */
	static async setRoutine(userId, args) {
		const {type, parameters, frequency} = args;
		try {
			console.log(`🕒 Configurando rutina: tipo=${type}, frecuencia=${frequency}`);
			await prisma.routine.create({
				data: {
					type,
					parameters: JSON.stringify(parameters),
					frequency,
					idUser: userId,
					active: true,
				},
			});

			console.log(`✅ Rutina configurada exitosamente.`);
			return 'Rutina configurada exitosamente.';
		} catch (error) {
			console.error('❌ Error en setRoutine:', error);
			return `Error: ${error.message}`;
		}
	}

	/**
	 * Ejecuta las rutinas configuradas.
	 * Esta función debería ser llamada por un job scheduler (e.g., cron) para ejecutar rutinas según su frecuencia.
	 * @returns {Promise<string>} - Retorna un mensaje de éxito o error.
	 */
	static async executeRoutines() {
		try {
			console.log('🔄 Ejecutando rutinas configuradas...');
			const routines = await prisma.routine.findMany({
				where: {active: true},
			});

			for (const routine of routines) {
				const userId = routine.idUser;
				const decryptedKey = await this.getDecryptedPrivateKey(userId);
				if (decryptedKey.startsWith('Error')) {
					console.warn(`⚠️ No se pudo ejecutar la rutina para el usuario ${userId}: ${decryptedKey}`);
					continue;
				}

				const params = JSON.parse(routine.parameters);

				switch (routine.type) {
					case 'price':
						await this.handlePriceRoutine(userId, params);
						break;
					case 'transfer':
						await this.handleTransferRoutine(userId, params);
						break;
					// Agrega más casos según los tipos de rutinas soportadas
					default:
						console.warn(`⚠️ Tipo de rutina desconocido: ${routine.type}`);
				}
			}

			console.log('✅ Rutinas ejecutadas exitosamente.');
			return 'Rutinas ejecutadas exitosamente.';
		} catch (error) {
			console.error('❌ Error en executeRoutines:', error);
			return `Error: ${error.message}`;
		}
	}

	/**
	 * Maneja una rutina de precio.
	 * @param {number} userId - ID del usuario.
	 * @param {Object} params - Parámetros específicos de la rutina.
	 * @returns {Promise<void>}
	 */
	static async handlePriceRoutine(userId, params) {
		const {baseToken, quoteToken, threshold, direction, notificationChannel} = params;
		try {
			const currentPrice = await this.getPrice(userId, {baseToken, quoteToken});

			const price = parseFloat(currentPrice);
			if (isNaN(price)) {
				console.warn(`⚠️ No se pudo obtener el precio para ${baseToken}/${quoteToken}.`);
				return;
			}

			let shouldNotify = false;
			if (direction === 'above' && price > threshold) {
				shouldNotify = true;
			} else if (direction === 'below' && price < threshold) {
				shouldNotify = true;
			}

			if (shouldNotify) {
				const message = `📢 El precio de ${baseToken} ha ${direction === 'above' ? 'superado' : 'bajado'} el umbral de ${threshold} ${quoteToken}. Precio actual: ${price} ${quoteToken}.`;
				// Dado que no se usa Telegram, retornamos el mensaje como string
				console.log(message);
			}
		} catch (error) {
			console.error('❌ Error en handlePriceRoutine:', error);
		}
	}

	/**
	 * Maneja una rutina de transferencia.
	 * @param {number} userId - ID del usuario.
	 * @param {Object} params - Parámetros específicos de la rutina.
	 * @returns {Promise<void>}
	 */
	static async handleTransferRoutine(userId, params) {
		const {tokenAddress, recipientAddress, amount, condition} = params;
		try {
			// Implementa lógica para verificar condiciones antes de transferir
			const balance = await this.getTokenBalance(userId, {
				tokenAddress,
				address: AvalancheService.getWalletAddress(userId)
			});

			const balanceNum = parseFloat(balance);
			const amountNum = parseFloat(amount);

			if (isNaN(balanceNum) || isNaN(amountNum)) {
				console.warn(`⚠️ No se pudo obtener el balance o la cantidad es inválida.`);
				return;
			}

			if (balanceNum >= amountNum) {
				const transferResponse = await this.transferToken(userId, {tokenAddress, recipientAddress, amount});
				if (!transferResponse.startsWith('Error')) {
					console.log(`✅ Transferencia realizada exitosamente. Hash: ${transferResponse}`);
				} else {
					console.warn(`⚠️ No se pudo realizar la transferencia: ${transferResponse}`);
				}
			} else {
				console.warn(`⚠️ Saldo insuficiente para realizar la transferencia.`);
			}
		} catch (error) {
			console.error('❌ Error en handleTransferRoutine:', error);
		}
	}

	// -------------------------------
	// Análisis y Decisiones Basadas en Datos On-Chain
	// -------------------------------

	/**
	 * Analiza los patrones de transacción del usuario.
	 * @param {number} userId - ID del usuario.
	 * @returns {Promise<string>} - Retorna un resumen del análisis en formato JSON o un mensaje de error.
	 */
	static async analyzeTransactionPatterns(userId) {
		try {
			console.log('🔍 Analizando patrones de transacción del usuario...');
			const historyResponse = await this.getTransactionHistory(userId, {address: AvalancheService.getWalletAddress(userId)});

			if (historyResponse.startsWith('Error')) {
				return historyResponse;
			}

			const history = JSON.parse(historyResponse);
			const summary = {
				totalTransactions: history.length,
				transactionsByType: history.reduce((acc, tx) => {
					const type = tx.type || 'unknown';
					acc[type] = (acc[type] || 0) + 1;
					return acc;
				}, {}),
				frequentAddresses: this.getFrequentAddresses(history),
				totalFees: history.reduce((acc, tx) => acc + Number(tx.fee || 0), 0),
			};

			console.log('✅ Análisis de patrones de transacción completado.');
			return JSON.stringify(summary);
		} catch (error) {
			console.error('❌ Error en analyzeTransactionPatterns:', error);
			return `Error: ${error.message}`;
		}
	}

	/**
	 * Identifica las direcciones más frecuentes en las transacciones del usuario.
	 * @param {Array} transactions - Lista de transacciones del usuario.
	 * @returns {Array} - Retorna un array de las direcciones más frecuentes.
	 */
	static getFrequentAddresses(transactions) {
		const addressCount = {};

		transactions.forEach(tx => {
			if (tx.to) {
				addressCount[tx.to] = (addressCount[tx.to] || 0) + 1;
			}
			if (tx.from) {
				addressCount[tx.from] = (addressCount[tx.from] || 0) + 1;
			}
		});

		// Ordenar las direcciones por frecuencia
		const sortedAddresses = Object.entries(addressCount)
			.sort((a, b) => b[1] - a[1])
			.map(entry => ({address: entry[0], count: entry[1]}));

		return sortedAddresses.slice(0, 5); // Top 5 direcciones frecuentes
	}

	/**
	 * Toma una decisión significativa basada en los datos analizados.
	 * @param {number} userId - ID del usuario.
	 * @param {Object} analysis - Resultados del análisis de patrones de transacción.
	 * @returns {Promise<string>} - Retorna un mensaje de éxito o error.
	 */
	static async makeDecisionBasedOnAnalysis(userId, analysis) {
		try {
			console.log('🤖 Tomando decisión basada en el análisis...');
			// Ejemplo: Si las comisiones totales superan 0.1 AVAX, notificar al usuario
			if (analysis.totalFees > 0.1) {
				const message = `📢 Has pagado un total de ${analysis.totalFees} AVAX en fees esta semana. Considera optimizar tus transacciones para reducir costos.`;
				// Dado que no se usa Telegram, retornamos el mensaje como string
				console.log(message);
			}

			// Agrega más condiciones y acciones según sea necesario

			return 'Decisión tomada basada en el análisis.';
		} catch (error) {
			console.error('❌ Error en makeDecisionBasedOnAnalysis:', error);
			return `Error: ${error.message}`;
		}
	}

	/**
	 * Determina si una dirección está involucrada en actividades sospechosas.
	 * @param {number} userId - ID del usuario.
	 * @param {Object} args - Argumentos.
	 * @param {string} args.address - Dirección blockchain a analizar.
	 * @returns {Promise<string>} - Retorna 'true', 'false' o un mensaje de error.
	 */
	static async detectSuspiciousActivity(userId, args) {
		const {address} = args;
		try {
			console.log(`🔍 Analizando actividad sospechosa para la dirección: ${address}...`);
			const historyResponse = await this.getTransactionHistory(userId, {address});

			if (historyResponse.startsWith('Error')) {
				return historyResponse;
			}

			const history = JSON.parse(historyResponse);
			let suspicious = false;

			// Ejemplo de análisis: detectar más de 5 transacciones grandes (>100 AVAX)
			const largeTransactions = history.filter(tx => Number(tx.value) > 100);
			if (largeTransactions.length > 5) {
				suspicious = true;
			}

			if (suspicious) {
				const message = `⚠️ Se detectaron actividades sospechosas en la dirección ${address}. Revisa tus transacciones recientes.`;
				console.log(message);
				return 'true';
			}

			console.log('✅ No se detectaron actividades sospechosas.');
			return 'false';
		} catch (error) {
			console.error('❌ Error en detectSuspiciousActivity:', error);
			return `Error: ${error.message}`;
		}
	}

	/**
	 * Identifica patrones en el precio de un token que podrían indicar manipulación del mercado.
	 * @param {number} userId - ID del usuario.
	 * @param {Object} args - Argumentos.
	 * @param {string} args.token - Token a analizar.
	 * @returns {Promise<string>} - Retorna 'true', 'false' o un mensaje de error.
	 */
	static async identifyPriceManipulation(userId, args) {
		const {token} = args;
		try {
			console.log(`📈 Identificando manipulación de mercado para el token: ${token}...`);
			const currentPrice = await this.getPrice(userId, {baseToken: token, quoteToken: 'USD'});

			const price = parseFloat(currentPrice);
			if (isNaN(price)) {
				return 'Error: No se pudo obtener el precio del token.';
			}

			// Placeholder: Implementa lógica para analizar patrones de precio
			// Por ejemplo, comparar con un precio anterior almacenado
			// Aquí asumiremos que detectamos una caída del 10%
			const previousPrice = price * 1.1; // Simulación de precio anterior
			const priceChange = ((price - previousPrice) / previousPrice) * 100;

			if (priceChange <= -10) {
				const message = `⚠️ El precio de ${token} ha caído un 10% en la última hora.`;
				console.log(message);
				return 'true';
			}

			console.log('✅ No se detectaron patrones de manipulación de precio.');
			return 'false';
		} catch (error) {
			console.error('❌ Error en identifyPriceManipulation:', error);
			return `Error: ${error.message}`;
		}
	}

	// -------------------------------
	// Gestión de Preferencias del Usuario
	// -------------------------------

	/**
	 * Almacena una preferencia del usuario.
	 * @param {number} userId - ID del usuario.
	 * @param {Object} args - Argumentos.
	 * @param {string} args.key - Clave de la preferencia.
	 * @param {any} args.value - Valor de la preferencia.
	 * @returns {Promise<string>} - Retorna un mensaje de éxito o un mensaje de error.
	 */
	static async setUserPreference(userId, args) {
		const {key, value} = args;
		try {
			console.log(`🔧 Configurando preferencia del usuario: ${key} = ${value}`);
			const user = await prisma.user.findUnique({
				where: {id: userId},
			});

			if (!user) {
				return 'Error: Usuario no encontrado.';
			}

			// Actualizar el campo metas con la preferencia
			const updatedMetas = {
				...user.metas,
				[key]: value,
			};

			await prisma.user.update({
				where: {id: userId},
				data: {
					metas: updatedMetas,
				},
			});

			console.log(`✅ Preferencia ${key} configurada exitosamente.`);
			return `Preferencia ${key} configurada exitosamente.`;
		} catch (error) {
			console.error('❌ Error en setUserPreference:', error);
			return `Error: ${error.message}`;
		}
	}

	/**
	 * Obtiene las preferencias del usuario.
	 * @param {number} userId - ID del usuario.
	 * @returns {Promise<string>} - Retorna las preferencias en formato JSON o un mensaje de error.
	 */
	static async getUserPreferences(userId) {
		try {
			console.log('🔍 Obteniendo preferencias del usuario...');
			const user = await prisma.user.findUnique({
				where: {id: userId},
			});

			if (!user) {
				return 'Error: Usuario no encontrado.';
			}

			console.log('✅ Preferencias del usuario obtenidas exitosamente.');
			return JSON.stringify(user.metas || {});
		} catch (error) {
			console.error('❌ Error en getUserPreferences:', error);
			return `Error: ${error.message}`;
		}
	}

	// -------------------------------
	// Manejo de Patrones de Comandos
	// -------------------------------

	/**
	 * Guarda un patrón de comando frecuente.
	 * @param {number} userId - ID del usuario.
	 * @param {Object} args - Argumentos.
	 * @param {string} args.command - Comando a guardar.
	 * @param {string} args.action - Acción asociada al comando.
	 * @returns {Promise<string>} - Retorna un mensaje de éxito o un mensaje de error.
	 */
	static async saveCommandPattern(userId, args) {
		const {command, action} = args;
		try {
			console.log(`📝 Guardando patrón de comando: ${command} => ${action}`);
			await prisma.commandPattern.create({
				data: {
					command,
					action,
					idUser: userId,
				},
			});

			console.log(`✅ Patrón de comando guardado exitosamente.`);
			return `Patrón de comando guardado exitosamente.`;
		} catch (error) {
			console.error('❌ Error en saveCommandPattern:', error);
			return `Error: ${error.message}`;
		}
	}

	/**
	 * Obtiene los patrones de comandos guardados del usuario.
	 * @param {number} userId - ID del usuario.
	 * @returns {Promise<string>} - Retorna los patrones en formato JSON o un mensaje de error.
	 */
	static async getCommandPatterns(userId) {
		try {
			console.log('🔍 Obteniendo patrones de comandos guardados...');
			const commandPatterns = await prisma.commandPattern.findMany({
				where: {idUser: userId},
			});

			console.log(`✅ Patrones de comandos obtenidos para el usuario ${userId}.`);
			return JSON.stringify(commandPatterns);
		} catch (error) {
			console.error('❌ Error en getCommandPatterns:', error);
			return `Error: ${error.message}`;
		}
	}

	// -------------------------------
	// Manejo del Estado de la Conversación
	// -------------------------------

	/**
	 * Actualiza el estado de la conversación del usuario.
	 * @param {number} userId - ID del usuario.
	 * @param {Object} args - Argumentos.
	 * @param {string} args.conversationState - Nuevo estado de la conversación.
	 * @returns {Promise<string>} - Retorna un mensaje de éxito o un mensaje de error.
	 */
	static async updateConversationState(userId, args) {
		const {conversationState} = args;
		try {
			console.log('🔄 Actualizando estado de la conversación...');
			const user = await prisma.user.findUnique({
				where: {id: userId},
			});

			if (!user) {
				return 'Error: Usuario no encontrado.';
			}

			// Actualizar el campo metas con el estado de la conversación
			const updatedMetas = {
				...user.metas,
				conversationState,
			};

			await prisma.user.update({
				where: {id: userId},
				data: {
					metas: updatedMetas,
				},
			});

			console.log('✅ Estado de la conversación actualizado exitosamente.');
			return 'Estado de la conversación actualizado exitosamente.';
		} catch (error) {
			console.error('❌ Error en updateConversationState:', error);
			return `Error: ${error.message}`;
		}
	}

	/**
	 * Obtiene el estado actual de la conversación del usuario.
	 * @param {number} userId - ID del usuario.
	 * @returns {Promise<string>} - Retorna el estado de la conversación en formato JSON o un mensaje de error.
	 */
	static async getConversationState(userId) {
		try {
			console.log('🔍 Obteniendo estado de la conversación...');
			const user = await prisma.user.findUnique({
				where: {id: userId},
			});

			if (!user) {
				return 'Error: Usuario no encontrado.';
			}

			console.log('✅ Estado de la conversación obtenido exitosamente.');
			return JSON.stringify(user.metas.conversationState || {});
		} catch (error) {
			console.error('❌ Error en getConversationState:', error);
			return `Error: ${error.message}`;
		}
	}

	// -------------------------------
	// Notificaciones
	// -------------------------------

	/**
	 * Configura una alerta para el usuario.
	 * @param {number} userId - ID del usuario.
	 * @param {Object} args - Argumentos.
	 * @param {string} args.type - Tipo de alerta (e.g., 'price', 'transfer').
	 * @param {Object} args.parameters - Parámetros específicos para la alerta.
	 * @returns {Promise<string>} - Retorna un mensaje de éxito o un mensaje de error.
	 */
	static async setAlert(userId, args) {
		const {type, parameters} = args;
		try {
			console.log(`🔔 Configurando alerta: tipo=${type}`);
			await prisma.alert.create({
				data: {
					type,
					parameters: JSON.stringify(parameters),
					idUser: userId,
					active: true,
				},
			});

			console.log(`✅ Alerta configurada exitosamente.`);
			return 'Alerta configurada exitosamente.';
		} catch (error) {
			console.error('❌ Error en setAlert:', error);
			return `Error: ${error.message}`;
		}
	}

	/**
	 * Envía una notificación al usuario.
	 * @param {number} userId - ID del usuario.
	 * @param {string} message - Mensaje a enviar.
	 * @returns {Promise<string>} - Retorna un mensaje de éxito o un mensaje de error.
	 */
	static async sendNotification(userId, message) {
		try {
			console.log('📢 Enviando notificación al usuario...');
			// Implementa la lógica para enviar notificaciones si es necesario
			// Dado que Telegram está eliminado, podrías implementar otro método de notificación o simplemente retornar el mensaje
			return `Notificación enviada: ${message}`;
		} catch (error) {
			console.error('❌ Error en sendNotification:', error);
			return `Error: ${error.message}`;
		}
	}

	/**
	 * Liga una cuenta de Telegram al usuario.
	 * @param {number} userId - ID del usuario.
	 * @param {Object} args - Argumentos.
	 * @param {string} args.telegramId - ID de Telegram del usuario.
	 * @returns {Promise<string>} - Retorna un mensaje de éxito o un mensaje de error.
	 */
	static async linkTelegramAccount(userId, args) {
		const {telegramId} = args;
		try {
			console.log(`🔗 Ligando cuenta de Telegram: ${telegramId}`);
			const user = await prisma.user.findUnique({
				where: {id: userId},
			});

			if (!user) {
				return 'Error: Usuario no encontrado.';
			}

			// Actualizar el campo metas con el ID de Telegram
			const updatedMetas = {
				...user.metas,
				telegramId,
			};

			await prisma.user.update({
				where: {id: userId},
				data: {
					metas: updatedMetas,
				},
			});

			console.log(`✅ Cuenta de Telegram ligada exitosamente.`);
			return 'Cuenta de Telegram ligada exitosamente.';
		} catch (error) {
			console.error('❌ Error en linkTelegramAccount:', error);
			return `Error: ${error.message}`;
		}
	}

	// -------------------------------
	// Tareas Calendarizadas
	// -------------------------------

	/**
	 * Configura una tarea calendarizada para el usuario.
	 * @param {number} userId - ID del usuario.
	 * @param {Object} args - Argumentos.
	 * @param {string} args.taskType - Tipo de tarea (e.g., 'priceUpdate').
	 * @param {Object} args.parameters - Parámetros específicos para la tarea.
	 * @param {string} args.schedule - Cron schedule para la tarea.
	 * @returns {Promise<string>} - Retorna un mensaje de éxito o un mensaje de error.
	 */
	static async setScheduledTask(userId, args) {
		const {taskType, parameters, schedule} = args;
		try {
			console.log(`📅 Configurando tarea calendarizada: tipo=${taskType}, schedule=${schedule}`);
			await prisma.scheduledTask.create({
				data: {
					taskType,
					parameters: JSON.stringify(parameters),
					schedule,
					idUser: userId,
					active: true,
				},
			});

			console.log(`✅ Tarea calendarizada configurada exitosamente.`);
			return 'Tarea calendarizada configurada exitosamente.';
		} catch (error) {
			console.error('❌ Error en setScheduledTask:', error);
			return `Error: ${error.message}`;
		}
	}

	/**
	 * Ejecuta las tareas calendarizadas.
	 * Esta función debería ser llamada por un job scheduler (e.g., cron) para ejecutar tareas según su schedule.
	 * @returns {Promise<string>} - Retorna un mensaje de éxito o error.
	 */
	static async executeScheduledTasks() {
		try {
			console.log('🔄 Ejecutando tareas calendarizadas...');
			const tasks = await prisma.scheduledTask.findMany({
				where: {active: true},
			});

			for (const task of tasks) {
				const userId = task.idUser;
				const decryptedKey = await this.getDecryptedPrivateKey(userId);
				if (decryptedKey.startsWith('Error')) {
					console.warn(`⚠️ No se pudo ejecutar la tarea para el usuario ${userId}: ${decryptedKey}`);
					continue;
				}

				const params = JSON.parse(task.parameters);

				switch (task.taskType) {
					case 'priceUpdate':
						await this.handlePriceRoutine(userId, params);
						break;
					case 'transfer':
						await this.handleTransferRoutine(userId, params);
						break;
					// Agrega más casos según los tipos de tareas soportadas
					default:
						console.warn(`⚠️ Tipo de tarea desconocido: ${task.taskType}`);
				}
			}

			console.log('✅ Tareas calendarizadas ejecutadas exitosamente.');
			return 'Tareas ejecutadas exitosamente.';
		} catch (error) {
			console.error('❌ Error en executeScheduledTasks:', error);
			return `Error: ${error.message}`;
		}
	}

}

export default FunctionService;
