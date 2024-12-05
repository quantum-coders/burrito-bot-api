import 'dotenv/config';
import AIService from '#services/ai.service.js';
import OpenAIService from '#services/openai.service.js';

import aiPrompts from '#ai/prompts.js';
import aiTools from '#ai/tools.js';

import {StringDecoder} from 'string_decoder';
import {Primate, PrimateService} from '@thewebchimp/primate';
import UserController from '#entities/users/user.controller.js';
import MessageService from '#entities/messages/message.service.js';
import FunctionService from "#services/function.service.js";

/**
 * Enhanced AiController with support for all Gemini features including:
 * - Structured data output
 * - Function calling
 * - Google Search grounding
 * - System instructions
 * while maintaining streaming capabilities
 */
class AiController {

	/**
	 * Process incoming AI message requests with streaming support
	 * @param {Object} req - Express request object
	 * @param {Object} res - Express response object
	 */
	static async message(req, res) {

		const buffers = {
			google: '',
		};

		try {
			const {
				prompt,
				system,
				responseSchema,
				tools,
				searchConfig,
				stream = true,
				temperature = 0.7,
				maxTokens,
				topP = 1,
				properties = {},
			} = req.body;

			// Validate input
			if (!prompt) {
				res.writeHead(400, {'Content-Type': 'application/json'});
				res.end(JSON.stringify({error: 'No prompt provided'}));
				return;
			}

			let sendSSE;

			if (stream) {
				// Setup SSE connection
				res.writeHead(200, {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					'Connection': 'keep-alive',
				});

				sendSSE = (data) => {
					res.write(`data: ${JSON.stringify(data)}\n\n`);
				};

				// Handle client disconnection
				req.on('close', () => {
					console.info('Client disconnected');
				});
			}

			// Prepare messages array
			const messages = [
				{
					role: 'system',
					content: system || 'Answer the user in a helpful and informative way',
				},
				{
					role: 'user',
					content: prompt,
				},
			];

			// Configure provider
			const provider = {
				name: 'google',
				model: process.env.GOOGLE_BASE_MODEL,
				prompt,
				messages,
				temperature,
				maxTokens,
				topP,
				responseSchema,
				tools,
				searchConfig,
				...properties,
			};

			try {

				const response = await AIService.sendMessage({
					model: provider.model,
					prompt: provider.prompt,
					stream,
					system: system,
					temperature: provider.temperature,
					maxTokens: provider.maxTokens,
					topP: provider.topP,
					responseSchema: provider.responseSchema,
					tools: provider.tools,
					searchConfig: provider.searchConfig,
				});

				if (stream) {
					await processStreamingResponse(
						response.data,
						provider.name,
						buffers,
						sendSSE,
						() => {
							sendSSE({type: 'complete', message: 'Provider finished'});
							setTimeout(() => {
								res.end();
							}, 5000);
						},
					);
				} else {

					let preparedResponse = response.candidates[0].content.parts[0].text;
					if (tools) preparedResponse = response.candidates[0].content.parts[0].functionCall;

					try {
						if (responseSchema) preparedResponse = JSON.parse(response.candidates[0].content.parts[0].text);
					} catch (e) {
						console.error('Error parsing response schema:', e);
						preparedResponse = response.candidates[0].content.parts[0].text;
					}

					res.respond({
						data: preparedResponse,
						message: 'Provider finished',
					});
				}
			} catch (error) {
				console.error(`Error from provider:`, error);
				if (error.response) {
					console.error('Error data:', error.response.data);
					console.error('Error status:', error.response.status);
					console.error('Error headers:', error.response.headers);
				}
				if (stream) {
					sendSSE({type: provider.name, error: error.message});
					res.end();
				} else {
					res.respond({
						status: 500,
						error: error.message,
					});
				}
			}

		} catch (e) {
			console.error('Error in message handler:', e);
			res.write(`data: ${JSON.stringify({type: 'error', error: 'Internal server error'})}\n\n`);
			res.end();
		}
	}

	static async paigeMessage(req, res) {
		try {
			const user = await UserController.validateMe(req);
			if (!user) return res.respond({status: 401, error: 'Unauthorized'});

			const {prompt, idChat, idThread, url, agent} = req.body;
			if (!prompt) return res.respond({status: 400, error: 'No prompt provided'});
			if (!idChat) return res.respond({status: 400, error: 'No chat ID provided'});
			if (!idThread) return res.respond({status: 400, error: 'No thread ID provided'});

			// Get message history
			const {messages, context} = await MessageService.getHistory(idChat, idThread);
			console.log('📨 Messages:', messages);
			console.log('📝 Initial context:', context);

			// Create the user message
			await PrimateService.create('message', {
				idUser: user.id,
				idChat,
				idThread,
				role: 'user',
				text: prompt,
				metas: {
					url,
				},
			});
			console.log('✅ User message created');

			OpenAIService.init();
			console.log('🔄 OpenAI Service initialized');

			res.writeHead(200, {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				'Connection': 'keep-alive',
			});
			console.log('📡 Response headers set');

			// Get function calls
			console.log('🚀 Sending message to OpenAI to get function calls...');
			const calls = await OpenAIService.sendMessage({
				system: `${aiPrompts.personality}\n\n`,
				prompt,
				messages,
				tools: aiTools,
				toolChoice: 'required',
			});
			console.log('🔧 Received function calls:', JSON.stringify(calls, null, 2));

			// Remove 'chatResponse' if it's the only call
			if (calls.length === 1) {
				const chatResponseIndex = calls.findIndex((call) => call.name === 'chatResponse');
				if (chatResponseIndex !== -1) {
					calls.splice(chatResponseIndex, 1);
					console.log('🗑️ Removed chatResponse as it was the only call');
				}
			}

			// Execute function calls and collect results
			const functionResults = {};
			console.log('⚙️ Starting function execution...');
			for (const call of calls) {
				console.log(`🛠 Executing function: ${call.name}`);
				console.log(`📥 Function arguments:`, JSON.stringify(call.args, null, 2));
				try {
					if (typeof FunctionService[call.name] === 'function') {
						const result = await FunctionService[call.name](call.args);
						functionResults[call.name] = result;
						console.log(`✅ Result of ${call.name}:`, JSON.stringify(result, null, 2));
					} else {
						console.error(`❌ Function ${call.name} not found in FunctionService`);
						functionResults[call.name] = {error: `Function ${call.name} not found`};
					}
				} catch (error) {
					console.error(`⚠️ Error executing function ${call.name}:`, error);
					functionResults[call.name] = {error: error.message};
				}
			}
			console.log('📊 All function results:', JSON.stringify(functionResults, null, 2));

			// Update system prompt with function results
			let systemPrompt = `${aiPrompts.personality}\n\n#Context:\n${JSON.stringify(context)}\n\n`;

			if (calls.length > 0) {
				const functionResultsSection = Object.entries(functionResults)
					.map(([functionName, result]) => `- ${functionName}: ${JSON.stringify(result)}`)
					.join('\n');

				if (agent) {
					systemPrompt += `
#Agent current information:
${JSON.stringify(agent)}`;
				}

				systemPrompt += `
#Function results:
${functionResultsSection}

Answer the user, letting them know the results of the operations.`;

				console.log('🔄 Updated system prompt with function results:');
				console.log(systemPrompt);
			} else {
				console.log('ℹ️ No function results to add to system prompt');
			}

			// Send function calls to the client
			for (const call of calls) {
				console.log('📤 Sending function call to client:', call);
				res.write('json: ' + JSON.stringify(call) + '\n\n');
			}

			// Send final response from assistant
			console.log('💬 Sending message to OpenAI to get final response...');
			console.log('📝 Final system prompt being sent:', systemPrompt);

			const response = await OpenAIService.sendMessage({
				system: systemPrompt,
				messages,
				prompt,
				stream: true,
			});

			let message = '';

			if (response && typeof response[Symbol.asyncIterator] === 'function') {
				console.log('📨 Starting to stream response...');
				for await (const part of response) {
					const content = part.choices[0].delta?.content || '';
					if (content) {
						res.write(`data: ${content}\n\n`);
						message += content;
					}
				}
				console.log('📝 Full assistant response:', message);
				res.write('data: [DONE]\n\n');

				// Store the assistant's message and update context
				console.log('💾 Generating new context...');

				const contextResponse = await OpenAIService.sendMessage({
					system: `${aiPrompts.personality}\n\n
Return a JSON object with information to remember from the conversation based on the user input.
Only store information if the message contains something meaningful, not trivial responses.
Try to maintain everything as a key-value, with just one level of values in the JSON.
Avoid creating new keys if the information is already present in the context.
If there is an addition to an existing key, append the new information to the existing value, maybe with commas.
Use the last JSON context and append the new information.`,
					messages: [
						{
							role: 'assistant',
							content: JSON.stringify(context),
						},
					],
					responseFormat: 'json',
					prompt,
				});
				console.log('📦 New context generated:', JSON.stringify(contextResponse, null, 2));

				await PrimateService.create('message', {
					idUser: user.id,
					idChat,
					idThread,
					role: 'assistant',
					text: message,
					metas: {
						url,
						context: {...context, ...contextResponse},
					},
				});
				console.log('✅ Assistant message stored successfully');

				res.end();
			} else {
				console.error('❌ Response is not an async iterable');
				res.write(`data: ${JSON.stringify({error: 'Streaming not supported'})}\n\n`);
				res.end();
			}
		} catch (error) {
			console.error(`❌ Error in paigeMessage:`, error);
			console.error('📚 Error stack:', error.stack);
			res.write(`data: Error: ${error.message}\n\n`);
			res.end();
		}
	}
}

/**
 * Process streaming response
 */
async function processStreamingResponse(stream, provider, buffers, sendSSE, onComplete) {
	const decoder = new StringDecoder('utf8');

	return new Promise((resolve, reject) => {
		stream.on('data', (chunk) => {
			const chunkStr = decoder.write(chunk);
			const lines = chunkStr.split('\n');

			lines.forEach(line => {
				if (line !== '') {
					processLine(line, provider, buffers, sendSSE);
				}
			});
		});

		stream.on('end', () => {
			// Handle any remaining characters
			const remaining = decoder.end();
			if (remaining) {
				const lines = remaining.split('\n');
				lines.forEach(line => {
					if (line !== '') {
						processLine(line, provider, buffers, sendSSE);
					}
				});
			}
			onComplete();
			resolve();
		});

		stream.on('error', (error) => {
			sendSSE({type: provider, error: error.message});
			onComplete();
			reject(error);
		});
	});
}

/**
 * Process individual line from stream
 */
function processLine(line, provider, buffers, sendSSE) {
	if (provider === 'google') {
		buffers.google += line;

		let extracted;
		while ((extracted = extractJSONObject(buffers.google)) !== null) {
			const {jsonStr, remaining} = extracted;
			buffers.google = remaining;

			try {
				const data = JSON.parse(jsonStr);
				const content = extractContent(data);

				if (content) {
					sendSSE({type: provider, data: {content}});
				}
			} catch (error) {
				console.error(`Error parsing ${provider} SSE data:`, error);
			}
		}
	}
}

/**
 * Extract JSON object from buffer
 */
function extractJSONObject(buffer) {
	let braceCount = 0;
	let inString = false;
	let escape = false;
	let start = -1;

	for (let i = 0; i < buffer.length; i++) {
		const char = buffer[i];

		if (inString) {
			if (escape) {
				escape = false;
			} else if (char === '\\') {
				escape = true;
			} else if (char === '"') {
				inString = false;
			}
			continue;
		}

		if (char === '"') {
			inString = true;
			continue;
		}

		if (char === '{') {
			if (braceCount === 0) start = i;
			braceCount++;
		} else if (char === '}') {
			braceCount--;
			if (braceCount === 0 && start !== -1) {
				return {
					jsonStr: buffer.substring(start, i + 1),
					remaining: buffer.substring(i + 1),
				};
			}
		}
	}

	return null;
}

/**
 * Extract content from parsed data
 */
function extractContent(data) {
	if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
		return data.candidates[0].content.parts[0].text;
	}
	return '';
}

export default AiController;
