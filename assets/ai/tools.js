export default {
  // Existing functions
  setAgentName: {
    name: 'setAgentName',
    description:
      'Sets the name of the agent. If the user provides a name directly, use it; otherwise, invent one.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The new name for the agent.',
        },
      },
      required: ['name'],
    },
  },
  setAgentDescription: {
    name: 'setAgentDescription',
    description:
      'Sets the description of the agent. If the user provides a description directly, use it; otherwise, invent one.',
    parameters: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description: 'The new description for the agent.',
        },
      },
      required: ['description'],
    },
  },
  chatResponse: {
    name: 'chatResponse',
    description: 'Function that tells the system to call a streaming message.',
    parameters: {
      type: 'object',
      properties: {
        originalPrompt: {
          type: 'string',
          description: 'The original prompt from the user.',
        },
      },
      required: ['originalPrompt'],
    },
  },
  updateAgent: {
    name: 'updateAgent',
    description: 'Sends the signal to update the agent.',
    parameters: {
      type: 'object',
      properties: {},
    },
    required: [],
  },
  addEntity: {
    name: 'addEntity',
    description: 'Adds a new entity to the agent.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The name of the new entity.',
        },
        description: {
          type: 'string',
          description: 'A description of the new entity.',
        },
      },
      required: ['name', 'description'],
    },
  },
  // New blockchain-related functions
  getPrice: {
    name: 'getPrice',
    description: 'Fetches the price of a cryptocurrency pair from Chainlink data feeds.',
    parameters: {
      type: 'object',
      properties: {
        baseToken: {
          type: 'string',
          description: 'The symbol of the base token (e.g., "ETH", "BTC").',
        },
        quoteToken: {
          type: 'string',
          description: 'The symbol of the quote token (default is "USD").',
          default: 'USD',
        },
      },
      required: ['baseToken'],
    },
  },
  getAvaxBalance: {
    name: 'getAvaxBalance',
    description: 'Retrieves the AVAX balance of a given blockchain address.',
    parameters: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'The blockchain address to retrieve the balance for.',
        },
      },
      required: ['address'],
    },
  },
  getTokenBalance: {
    name: 'getTokenBalance',
    description: 'Retrieves the balance of a specific ERC20 token for a given address.',
    parameters: {
      type: 'object',
      properties: {
        tokenAddress: {
          type: 'string',
          description: 'The contract address of the ERC20 token.',
        },
        address: {
          type: 'string',
          description: 'The blockchain address to retrieve the token balance for.',
        },
      },
      required: ['tokenAddress', 'address'],
    },
  },
  getAvaxUsdPrice: {
    name: 'getAvaxUsdPrice',
    description: 'Retrieves the current AVAX to USD price from Chainlink data feeds.',
    parameters: {
      type: 'object',
      properties: {},
    },
    required: [],
  },
  getRecentTransfers: {
    name: 'getRecentTransfers',
    description: 'Gets recent transfers of a token on the Avalanche network.',
    parameters: {
      type: 'object',
      properties: {
        tokenAddress: {
          type: 'string',
          description: 'The contract address of the token.',
        },
        blockCount: {
          type: 'integer',
          description: 'The number of recent blocks to search (default is 1000).',
          default: 1000,
        },
      },
      required: ['tokenAddress'],
    },
  },
  getTransactionHistory: {
    name: 'getTransactionHistory',
    description: 'Retrieves the transaction history for a given blockchain address.',
    parameters: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'The blockchain address to get the transaction history for.',
        },
        startBlock: {
          type: 'integer',
          description: 'The starting block number to fetch transactions from (default is 0).',
          default: 0,
        },
        endBlock: {
          type: 'string',
          description: 'The ending block number to fetch transactions up to (default is "latest").',
          default: 'latest',
        },
      },
      required: ['address'],
    },
  },
  getLatestPrices: {
    name: 'getLatestPrices',
    description: 'Fetches the latest AVAX/WETH prices from different decentralized exchanges.',
    parameters: {
      type: 'object',
      properties: {},
    },
    required: [],
  },
  getBlockNumber: {
    name: 'getBlockNumber',
    description: 'Retrieves the current block number of the Avalanche network.',
    parameters: {
      type: 'object',
      properties: {},
    },
    required: [],
  },
  getAmountsOut: {
    name: 'getAmountsOut',
    description:
      'Calculates the output amount of tokens for a given input amount on a specific exchange.',
    parameters: {
      type: 'object',
      properties: {
        tokenInAddress: {
          type: 'string',
          description: 'The contract address of the input token.',
        },
        tokenOutAddress: {
          type: 'string',
          description: 'The contract address of the output token.',
        },
        amountIn: {
          type: 'number',
          description: 'The amount of input tokens.',
        },
        exchange: {
          type: 'string',
          description: 'The name of the exchange.',
          enum: ['sushi', 'trader-joe', 'pangolin'],
        },
      },
      required: ['tokenInAddress', 'tokenOutAddress', 'amountIn', 'exchange'],
    },
  },
  // Additional functions as needed
  getBlockInformation: {
    name: 'getBlockInformation',
    description: 'Retrieves information about a specific block on the Avalanche network.',
    parameters: {
      type: 'object',
      properties: {
        blockNumber: {
          type: 'string',
          description: 'The block number to fetch information for (default is "latest").',
          default: 'latest',
        },
      },
      required: [],
    },
  },
  isSupportedPair: {
    name: 'isSupportedPair',
    description: 'Checks if a given token pair is supported by Chainlink feeds.',
    parameters: {
      type: 'object',
      properties: {
        baseToken: {
          type: 'string',
          description: 'The symbol of the base token.',
        },
        quoteToken: {
          type: 'string',
          description: 'The symbol of the quote token (default is "USD").',
          default: 'USD',
        },
      },
      required: ['baseToken'],
    },
  },
  getAllSupportedPairs: {
    name: 'getAllSupportedPairs',
    description: 'Retrieves all token pairs supported by Chainlink feeds.',
    parameters: {
      type: 'object',
      properties: {},
    },
    required: [],
  },
};
