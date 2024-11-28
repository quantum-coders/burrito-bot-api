// Test configuration
import AvalancheService from "#services/avalanche.service.js";
import ChainlinkService from "#services/chainlink.service.js";
import {ethers} from 'ethers';

// Test configuration
const TEST_CONFIG = {
	// Trader Joe Router v3
	testAddress: '0xb4315e873dBcf96Ffd0acd8EA43f689D8c20fB30',
	// WAVAX token address
	wavaxAddress: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
	// Example secret key for encryption (32 bytes in hex)
	secretKey: '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
	// RPC URL
	rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
	// Test wallet for transactions (wallet con fondos)
	testPrivateKey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', // Esto debería ser reemplazado por la private key real
	testWalletAddress: '0xc1Dae38A9f66453B97a4a01c10db9cC9525B49c6',
	// Test ERC20 token (USDC)
	testTokenAddress: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
	// Test spender address (Trader Joe Router)
	testSpenderAddress: '0xb4315e873dBcf96Ffd0acd8EA43f689D8c20fB30',
	// Example contract ABI for testing
	testContractAbi: [
		"function balanceOf(address owner) view returns (uint256)",
		"function transfer(address to, uint256 amount) returns (bool)"
	]
};

async function testAvalancheService() {
	console.log('🚀 Iniciando pruebas de AvalancheService...\n');

	try {
		// Test 1: Wallet encryption/decryption
		console.log('🔒 Probando encriptación de wallet...');
		const testPrivateKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
		const encrypted = AvalancheService.encryptWallet(testPrivateKey, TEST_CONFIG.secretKey);
		const decrypted = AvalancheService.decryptWallet(encrypted, TEST_CONFIG.secretKey);
		console.log('✅ Encriptación exitosa:', encrypted.content.slice(0, 20) + '...');
		console.log('✅ Desencriptación exitosa:', decrypted === testPrivateKey ? 'Coincide' : 'Error');
		console.log('');

		// Test 2: Address validation
		console.log('📝 Probando validación de direcciones...');
		const isValid = AvalancheService.isValidAddress(TEST_CONFIG.testAddress);
		console.log('✅ Validación de dirección:', isValid ? 'Válida' : 'Inválida');
		console.log('');

		// Test 3: AVAX balance
		console.log('💰 Probando consulta de balance AVAX...');
		const avaxBalance = await AvalancheService.getAvaxBalance(TEST_CONFIG.testAddress);
		console.log('✅ Balance AVAX:', avaxBalance);
		console.log('');

		// Test 4: Token balance
		console.log('🪙 Probando consulta de balance de token...');
		const tokenBalance = await AvalancheService.getTokenBalance(
			TEST_CONFIG.wavaxAddress,
			TEST_CONFIG.testAddress
		);
		console.log('✅ Balance Token:', tokenBalance);
		console.log('');

		// Test 5: Recent transfers
		console.log('📜 Probando consulta de transferencias recientes...');
		const transfers = await AvalancheService.getRecentTransfers(TEST_CONFIG.wavaxAddress, 100);
		console.log('✅ Transferencias encontradas:', transfers.length);
		if (transfers.length > 0) {
			console.log('📊 Primera transferencia:', {
				from: transfers[0].from.slice(0, 10) + '...',
				to: transfers[0].to.slice(0, 10) + '...',
				value: transfers[0].value
			});
		}

		console.log('\n🎉 Todas las pruebas de AvalancheService completadas exitosamente! 🎉\n');

	} catch (error) {
		console.error('\n❌ Error en AvalancheService:', error.message);
	}
}

async function testChainlinkService() {
	console.log('🔗 Iniciando pruebas de ChainlinkService...\n');

	try {
		// Initialize provider and service
		const provider = new ethers.providers.StaticJsonRpcProvider(TEST_CONFIG.rpcUrl);
		const chainlinkService = new ChainlinkService(provider);

		// Test 1: Get supported pairs
		console.log('📋 Probando obtención de pares soportados...');
		const supportedPairs = ChainlinkService.getAllSupportedPairs();
		console.log('✅ Pares soportados encontrados:', supportedPairs.length);
		console.log('📊 Primeros 5 pares:', supportedPairs.slice(0, 5));
		console.log('');

		// Test 2: Check pair support
		console.log('🔍 Probando verificación de soporte de pares...');
		const isAvaxUsdSupported = ChainlinkService.isSupported('AVAX', 'USD');
		const isLinkAvaxSupported = ChainlinkService.isSupported('LINK', 'AVAX');
		console.log('✅ AVAX/USD soportado:', isAvaxUsdSupported);
		console.log('✅ LINK/AVAX soportado:', isLinkAvaxSupported);
		console.log('');

		// Test 3: Get single price
		console.log('💲 Probando obtención de precio individual...');
		const avaxPrice = await chainlinkService.getPrice('AVAX', 'USD');
		console.log('✅ Precio AVAX/USD:', avaxPrice.price);
		console.log('✅ Timestamp:', new Date(avaxPrice.timestamp * 1000).toLocaleString());
		console.log('');

		// Test 4: Get multiple prices
		console.log('💹 Probando obtención de múltiples precios...');
		const tokens = ['BTC', 'ETH', 'LINK'];
		const prices = await chainlinkService.getPrices(tokens);
		console.log('✅ Precios obtenidos:');
		prices.forEach(price => {
			console.log(`   ${price.pair}: $${price.price}`);
		});

		console.log('\n🎉 Todas las pruebas de ChainlinkService completadas exitosamente! 🎉');

	} catch (error) {
		console.error('\n❌ Error en ChainlinkService:', error.message);
	}
}

async function testTransactionManagement() {
	console.log('💫 Iniciando pruebas de gestión de transacciones...\n');

	try {
		// Create test wallet
		const provider = new ethers.providers.StaticJsonRpcProvider(TEST_CONFIG.rpcUrl);

		// Test 1: Gas estimation (ahora usando una dirección EOA normal)
		console.log('⛽ Probando estimación de gas...');
		const randomAddress = '0x0000000000000000000000000000000000000000'; // Dirección cero para test
		const gasEstimate = await AvalancheService.estimateGasForTransaction(
			TEST_CONFIG.testWalletAddress,
			randomAddress,
			'0.001' // Solo 0.001 AVAX para el test
		);
		console.log('✅ Estimación de gas:', {
			gasLimit: gasEstimate.gasLimit,
			gasPrice: gasEstimate.gasPrice,
			estimatedCost: gasEstimate.estimatedCost
		});
		console.log('');

		// Test 2: Transaction history usando getBlock
		console.log('📜 Probando obtención de historial de transacciones...');
		const latestBlock = await provider.getBlockNumber();
		const block = await provider.getBlock(latestBlock);
		const txs = await Promise.all(
			block.transactions.slice(0, 5).map(async (txHash) => {
				const tx = await provider.getTransaction(txHash);
				const receipt = await provider.getTransactionReceipt(txHash);
				return {
					hash: tx.hash,
					from: tx.from,
					to: tx.to,
					value: ethers.utils.formatEther(tx.value),
					gasUsed: receipt.gasUsed.toString(),
					gasPrice: ethers.utils.formatUnits(tx.gasPrice, 'gwei'),
					status: receipt.status
				};
			})
		);
		console.log('✅ Últimas transacciones encontradas:', txs.length);
		if (txs.length > 0) {
			console.log('📊 Ejemplo de transacción:', {
				hash: txs[0].hash.slice(0, 10) + '...',
				value: txs[0].value,
				gasUsed: txs[0].gasUsed
			});
		}
		console.log('');

		// Test 3: Block information
		console.log('🧊 Probando obtención de información de bloque...');
		const blockInfo = await AvalancheService.getBlockInformation('latest');
		console.log('✅ Información del bloque:', {
			number: blockInfo.number,
			timestamp: new Date(blockInfo.timestamp * 1000).toLocaleString(),
			gasUsed: blockInfo.gasUsed,
			transactions: blockInfo.transactions.length
		});
		console.log('');

		// Test 4: Token balance check
		console.log('💰 Probando consulta de balances adicionales...');
		const avaxBalance = await AvalancheService.getAvaxBalance(TEST_CONFIG.testWalletAddress);
		const usdcBalance = await AvalancheService.getTokenBalance(
			TEST_CONFIG.testTokenAddress,
			TEST_CONFIG.testWalletAddress
		);
		console.log('✅ Balance AVAX:', avaxBalance);
		console.log('✅ Balance USDC:', usdcBalance);
		console.log('');

		// Test 5: Simple contract query
		console.log('🤝 Probando consulta simple a contrato...');
		const wavaxContract = new ethers.Contract(
			TEST_CONFIG.wavaxAddress,
			['function totalSupply() view returns (uint256)'],
			provider
		);
		const totalSupply = await wavaxContract.totalSupply();
		console.log('✅ Total Supply WAVAX:', ethers.utils.formatEther(totalSupply));

		console.log('\n🎉 Todas las pruebas de gestión de transacciones completadas exitosamente! 🎉\n');

	} catch (error) {
		console.error('\n❌ Error en pruebas de transacciones:', error.message);
	}
}// Run all tests
console.log('⚡️ Iniciando script de pruebas...\n');

Promise.all([
	testAvalancheService(),
	testChainlinkService(),
	testTransactionManagement()
])
	.then(() => console.log('\n✨ Todas las pruebas finalizadas'))
	.catch(error => console.error('\n💥 Error fatal:', error));
