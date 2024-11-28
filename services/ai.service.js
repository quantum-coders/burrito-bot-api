import 'dotenv/config';
import axios from 'axios';
import { googleModels } from '../assets/data/ai-models.js';

/**
 * Enhanced AIService class that supports all Gemini features including:
 * - Structured data output
 * - Function calling
 * - Google Search grounding
 * - System instructions
 */
class AIService {
	/**
	 * Send a message to the Gemini API with support for all features
	 * @param {Object} data - The request data
	 * @param {string} data.model - Model identifier
	 * @param {string} data.prompt - The prompt text
	 * @param {string} [data.stream=false] - Whether to stream the response
	 * @param {string} [data.system] - System instruction
	 * @param {Array} [data.history] - Chat history
	 * @param {number} [data.temperature=0.5] - Temperature for response generation
	 * @param {number} [data.max_tokens] - Maximum tokens in response
	 * @param {number} [data.top_p=1] - Top p sampling
	 * @param {string} [data.stop=''] - Stop sequence
	 * @param {boolean} [data.stream=false] - Whether to stream the response
	 * @param {Object} [data.responseSchema] - Schema for structured output
	 * @param {Array} [data.tools] - Function declarations for function calling
	 * @param {Object} [data.searchConfig] - Configuration for Google Search grounding
	 * @returns {Promise<Object>} The API response
	 */
	static async sendMessage(data) {
		const {
			model = process.env.GOOGLE_BASE_MODEL,
			system = 'You are a helpful assistant.',
			prompt,
			stream = false,
			history = [],
			temperature = 1,
			max_tokens,
			top_p = 1,
			stop = '',
			responseSchema,
			tools,
			searchConfig,
		} = data;

		try {
			const modelInfo = this.getModelInfo(model);
			const { contextWindow, authToken } = modelInfo;

			// Prepare base content structure
			const contents = this.prepareContents(system, history, prompt);

			// Validate token count and adjust content if needed
			const { adjustedContent, adjustedMaxTokens } = await this.validateAndAdjustTokens(
				model,
				contents,
				contextWindow,
				max_tokens,
			);

			// Prepare the complete request data
			const requestData = this.prepareRequestData({
				contents: adjustedContent,
				temperature,
				maxTokens: adjustedMaxTokens,
				topP: top_p,
				stop,
				responseSchema,
				tools,
				searchConfig,
				system,
			});

			// Get request configuration
			const { url, headers } = this.getRequestConfig(model, stream, authToken);

			// Prepare axios config
			const axiosConfig = {
				headers: {
					'Content-Type': 'application/json',
					...headers,
				},
				...(stream && { responseType: 'stream', decompress: true })
			};

			console.log('Request data:', requestData);

			const response = await axios.post(url, requestData, axiosConfig);

			if(response.status !== 200) throw new Error(`HTTP error! status: ${ response.status }`);

			return stream ? response : response.data;

		} catch(error) {
			console.error('Error in sendMessage:', error.message);

			if(error.response) {
				// The request was made and the server responded with a status code
				console.error('Error response status:', error.response.status);
				console.error('Error response data:', error.response.data);
			} else if(error.request) {
				// The request was made but no response was received
				console.error('No response received:', error.request);
			} else {
				// Something happened in setting up the request that triggered an Error
				console.error('Error setting up request:', error.message);
			}

			console.error('Error config:', error.config);
			throw new Error(`Error processing the request: ${ error.message }`);
		}
	}

	/**
	 * Validate required inputs
	 * @param {Object} data - Input data to validate
	 */
	static validateInputs(data) {
		const { model, prompt } = data;
		if(!model || !prompt) {
			throw new Error(`Missing required fields: ${ !model ? 'model' : 'prompt' }`);
		}
	}

	/**
	 * Prepare the content array with system instruction, history, and prompt
	 * @param {string} system - System instruction
	 * @param {Array} history - Chat history
	 * @param {string} prompt - Current prompt
	 * @returns {Array} Prepared contents array
	 */
	static prepareContents(system, history, prompt) {
		return [
			...history.map(msg => ({
				role: msg.role === 'assistant' ? 'model' : 'user',
				parts: [ { text: msg.content } ],
			})),
			{ role: 'user', parts: [ { text: prompt } ] },
		];
	}

	/**
	 * Validate token count and adjust content if needed
	 * @param {string} model - Model identifier
	 * @param {Array} contents - Content array
	 * @param {number} contextWindow - Context window size
	 * @param {number} maxTokens - Maximum tokens requested
	 * @returns {Object} Adjusted content and tokens
	 */
	static async validateAndAdjustTokens(model, contents, contextWindow, maxTokens) {
		const reservedTokens = 100;
		const tokenCount = await this.countTokens(model, contents);

		const availableTokens = contextWindow - tokenCount - reservedTokens;
		const adjustedMaxTokens = Math.min(maxTokens || availableTokens, availableTokens);

		if(adjustedMaxTokens <= 0) {
			throw new Error('Not enough tokens available for response');
		}

		const adjustedContent = await this.adjustContent(model, contents, contextWindow, reservedTokens);

		return { adjustedContent, adjustedMaxTokens };
	}

	static extractFunctionCalls(response) {
		// check that response.candidates[0].content.parts exists and is an array
		if(!!Array.isArray(response.candidates?.[0]?.content?.parts)) {
			// iterate and extract function calls
			return response.candidates[0].content.parts.reduce((calls, part) => {
				if(part.functionCall) {
					calls.push(part.functionCall);
				}
				return calls;
			}, []);
		}

		return [];
	}

	/**
	 * Prepare complete request data including all features
	 * @param {Object} config - Configuration object
	 * @returns {Object} Complete request data
	 */
	static prepareRequestData(config) {
		const {
			contents,
			temperature,
			maxTokens,
			topP,
			stop,
			responseSchema,
			tools,
			searchConfig,
			system,
		} = config;

		const requestData = {
			contents,
			generationConfig: {
				temperature,
				//maxOutputTokens: maxTokens,
				topP,
				stopSequences: stop ? [ stop ] : undefined,
			},
		};

		// Add system instruction if provided
		if(system) {
			requestData.systemInstruction = {
				parts: [ { text: system } ],
			};
		}

		// Add structured output configuration if provided
		if(responseSchema) {
			requestData.generationConfig.responseSchema = responseSchema;
			requestData.generationConfig.response_mime_type = 'application/json';
		}

		// Add function calling configuration if provided
		if(Array.isArray(tools) && tools.length) {
			requestData.tools = [ { functionDeclarations: [ ...tools ] } ];

			requestData.toolConfig = {
				functionCallingConfig: {
					mode: 'ANY',
				},
			};
		}

		// Add Google Search grounding configuration if provided
		if(searchConfig) {

			// change contents to remove the role
			requestData.contents = requestData.contents.map((content) => {
				return {
					parts: content.parts,
				};
			});

			requestData.tools = [
				...(requestData.tools || []),
				{
					google_search_retrieval: {
						dynamic_retrieval_config: searchConfig,
					},
				},
			];

			// remove system instruction if it exists
			delete requestData.system_instruction;

			// remove generationConfig if it exists
			delete requestData.generationConfig;
		}

		return requestData;
	}

	// Existing helper methods remain unchanged
	static async countTokens(model, contents) {
		const apiKey = process.env.GOOGLE_API_KEY;
		const url = `https://generativelanguage.googleapis.com/v1beta/models/${ model }:countTokens?key=${ apiKey }`;

		try {
			const response = await axios.post(url, { contents });
			return response.data.totalTokens;
		} catch(error) {
			console.error('Error counting tokens:', error);
			throw error;
		}
	}

	static async adjustContent(model, contents, contextWindow, reservedTokens) {
		const targetTokens = contextWindow - reservedTokens;
		let currentTokens = await this.countTokens(model, contents);

		while(currentTokens > targetTokens) {
			if(contents.length <= 2) break;
			contents.splice(1, 1);
			currentTokens = await this.countTokens(model, contents);
		}

		return contents;
	}

	static getModelInfo(model) {
		const modelInfo = googleModels.find(m => m.name === model);
		if(!modelInfo) throw new Error(`Model info not found for ${ model }`);

		const authToken = process.env.GOOGLE_API_KEY;
		if(!authToken) throw new Error('Google API key not found in environment variables');

		return { ...modelInfo, authToken };
	}

	static getRequestConfig(model, stream, authToken) {
		return {
			url: `https://generativelanguage.googleapis.com/v1beta/models/${ model }:${ stream ? 'streamGenerateContent' : 'generateContent' }?key=${ authToken }`,
			headers: {},
		};
	}
}

export default AIService;
