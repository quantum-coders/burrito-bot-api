export default {
	// -------------------------------
	// Funciones Principales
	// -------------------------------
	chatResponse: {
		name: 'chatResponse',
		description: 'Función que indica al sistema que llame a un mensaje de streaming.',
		parameters: {
			type: 'object',
			properties: {
				originalPrompt: {
					type: 'string',
					description: 'El prompt original del usuario.',
				},
			},
			required: ['originalPrompt'],
		},
	},
	updateAgent: {
		name: 'updateAgent',
		description: 'Envía la señal para actualizar el agente.',
		parameters: {
			type: 'object',
			properties: {},
			required: [],
		},
	},
	addEntity: {
		name: 'addEntity',
		description: 'Agrega una nueva entidad al agente.',
		parameters: {
			type: 'object',
			properties: {
				name: {
					type: 'string',
					description: 'El nombre de la nueva entidad.',
				},
				description: {
					type: 'string',
					description: 'Una descripción de la nueva entidad.',
				},
			},
			required: ['name', 'description'],
		},
	},
	// -------------------------------
	// Funciones de Precios de Chainlink
	// -------------------------------
	getEthUsdPrice: {
		name: 'getEthUsdPrice',
		description: 'Obtiene el precio de ETH a USD desde los data feeds de Chainlink.',
		parameters: {
			type: 'object',
			properties: {},
			required: [],
		},
	},
	getBtcUsdPrice: {
		name: 'getBtcUsdPrice',
		description: 'Obtiene el precio de BTC a USD desde los data feeds de Chainlink.',
		parameters: {
			type: 'object',
			properties: {},
			required: [],
		},
	},
	getAvaxUsdPrice: {
		name: 'getAvaxUsdPrice',
		description: 'Obtiene el precio de AVAX a USD desde los data feeds de Chainlink.',
		parameters: {
			type: 'object',
			properties: {},
			required: [],
		},
	},
	getLinkUsdPrice: {
		name: 'getLinkUsdPrice',
		description: 'Obtiene el precio de LINK a USD desde los data feeds de Chainlink.',
		parameters: {
			type: 'object',
			properties: {},
			required: [],
		},
	},
	getDaiUsdPrice: {
		name: 'getDaiUsdPrice',
		description: 'Obtiene el precio de DAI a USD desde los data feeds de Chainlink.',
		parameters: {
			type: 'object',
			properties: {},
			required: [],
		},
	},
	getAllSupportedPairs: {
		name: 'getAllSupportedPairs',
		description: 'Obtiene todos los pares soportados de los data feeds de Chainlink.',
		parameters: {
			type: 'object',
			properties: {},
			required: [],
		},
	},
	isSupportedPair: {
		name: 'isSupportedPair',
		description: 'Verifica si un par dado es soportado por Chainlink.',
		parameters: {
			type: 'object',
			properties: {
				baseToken: {
					type: 'string',
					description: 'Token base (ej. "ETH").',
				},
				quoteToken: {
					type: 'string',
					description: 'Token de cotización (ej. "USD").',
					default: 'USD',
				},
			},
			required: ['baseToken'],
		},
	},
	getPrice: {
		name: 'getPrice',
		description: 'Obtiene el precio de un par específico de criptomonedas.',
		parameters: {
			type: 'object',
			properties: {
				baseToken: {
					type: 'string',
					description: 'Token base.',
				},
				quoteToken: {
					type: 'string',
					description: 'Token de cotización.',
					default: 'USD',
				},
			},
			required: ['baseToken'],
		},
	},
	// -------------------------------
	// Funciones Relacionadas con Balances y Transacciones en la Red Avalanche
	// -------------------------------
	getAvaxBalance: {
		name: 'getAvaxBalance',
		description: 'Recupera el saldo de AVAX de una dirección blockchain dada.',
		parameters: {
			type: 'object',
			properties: {
				address: {
					type: 'string',
					description: 'La dirección blockchain para la cual se recupera el saldo.',
				},
			},
			required: ['address'],
		},
	},
	getTokenBalance: {
		name: 'getTokenBalance',
		description: 'Recupera el saldo de un token ERC20 específico para una dirección dada.',
		parameters: {
			type: 'object',
			properties: {
				tokenAddress: {
					type: 'string',
					description: 'La dirección del contrato del token ERC20.',
				},
				address: {
					type: 'string',
					description: 'La dirección blockchain para la cual se recupera el saldo del token.',
				},
			},
			required: ['tokenAddress', 'address'],
		},
	},
	getRecentTransfers: {
		name: 'getRecentTransfers',
		description: 'Obtiene transferencias recientes de un token en la red Avalanche.',
		parameters: {
			type: 'object',
			properties: {
				tokenAddress: {
					type: 'string',
					description: 'La dirección del contrato del token.',
				},
				blockCount: {
					type: 'integer',
					description: 'El número de bloques recientes para buscar (por defecto es 1000).',
					default: 1000,
				},
			},
			required: ['tokenAddress'],
		},
	},
	getTransactionHistory: {
		name: 'getTransactionHistory',
		description: 'Recupera el historial de transacciones para una dirección blockchain dada.',
		parameters: {
			type: 'object',
			properties: {
				address: {
					type: 'string',
					description: 'La dirección blockchain para la cual se obtiene el historial de transacciones.',
				},
				startBlock: {
					type: 'integer',
					description: 'El número de bloque inicial para obtener transacciones (por defecto es 0).',
					default: 0,
				},
				endBlock: {
					type: 'string',
					description: 'El número de bloque final para obtener transacciones hasta (por defecto es "latest").',
					default: 'latest',
				},
			},
			required: ['address'],
		},
	},
	// -------------------------------
	// Funciones para Manejo del Estado de Conversación
	// -------------------------------
	manageConversationState: {
		name: 'manageConversationState',
		description: 'Maneja el estado de la conversación para mantener el contexto.',
		parameters: {
			type: 'object',
			properties: {
				userId: {
					type: 'string',
					description: 'ID del usuario.',
				},
				stateData: {
					type: 'object',
					description: 'Datos del estado de la conversación.',
				},
			},
			required: ['userId', 'stateData'],
		},
	},
	updateConversationState: {
		name: 'updateConversationState',
		description: 'Actualiza el estado de la conversación del usuario.',
		parameters: {
			type: 'object',
			properties: {
				conversationState: {
					type: 'string',
					description: 'Nuevo estado de la conversación.',
				},
			},
			required: ['conversationState'],
		},
	},
	getConversationState: {
		name: 'getConversationState',
		description: 'Obtiene el estado actual de la conversación del usuario.',
		parameters: {
			type: 'object',
			properties: {
				userId: {
					type: 'string',
					description: 'ID del usuario.',
				},
			},
			required: ['userId'],
		},
	},
	// -------------------------------
	// Funciones de Gestión de Preferencias
	// -------------------------------
	setUserPreference: {
		name: 'setUserPreference',
		description: 'Almacena una preferencia del usuario.',
		parameters: {
			type: 'object',
			properties: {
				key: {
					type: 'string',
					description: 'Clave de la preferencia.',
				},
				value: {
					oneOf: [
						{type: 'string'},
						{type: 'number'},
						{type: 'boolean'},
						{type: 'object'},
						{
							type: 'array',
							items: {type: 'string'} // Cambia "string" según el tipo de elementos esperados
						}
					],
					description: 'Valor de la preferencia. Puede ser una cadena, número, booleano, objeto o arreglo.',
				},
			},
			required: ['key', 'value'],
		},
	},

	getUserPreferences: {
		name: 'getUserPreferences',
		description: 'Recupera las preferencias del usuario.',
		parameters: {
			type: 'object',
			properties: {
				userId: {
					type: 'string',
					description: 'ID del usuario.',
				},
			},
			required: ['userId'],
		},
	},
	// -------------------------------
	// Manejo de Notificaciones
	// -------------------------------
	sendTelegramNotification: {
		name: 'sendTelegramNotification',
		description: 'Envía una notificación al usuario vía Telegram.',
		parameters: {
			type: 'object',
			properties: {
				message: {
					type: 'string',
					description: 'El mensaje a enviar.',
				},
				chatId: {
					type: 'string',
					description: 'El ID del chat de Telegram del usuario.',
				},
			},
			required: ['message', 'chatId'],
		},
	},
};
