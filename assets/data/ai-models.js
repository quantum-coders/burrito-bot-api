const openAIModels = [
	{name: 'gpt-4-1106-preview', contextWindow: 128000},
	{name: 'chatgpt-4o-latest', contextWindow: 2049},
	{name: 'tts-1-hd-1106', contextWindow: 2049},
	{name: 'tts-1-hd', contextWindow: 2049},
	{name: 'dall-e-2', contextWindow: 2049},
	{name: 'text-embedding-3-large', contextWindow: 2049},
	{name: 'gpt-4-0125-preview', contextWindow: 128000},
	{name: 'gpt-3.5-turbo-0125', contextWindow: 16385},
	{name: 'gpt-4o-mini', contextWindow: 2049},
	{name: 'gpt-4o-mini-2024-07-18', contextWindow: 2049},
	{name: 'gpt-4-turbo-preview', contextWindow: 128000},
	{name: 'gpt-3.5-turbo', contextWindow: 4097},
	{name: 'tts-1-1106', contextWindow: 2049},
	{name: 'gpt-3.5-turbo-0613', contextWindow: 4097},
	{name: 'whisper-1', contextWindow: 2049},
	{name: 'gpt-3.5-turbo-16k-0613', contextWindow: 16385},
	{name: 'gpt-4-turbo', contextWindow: 2049},
	{name: 'tts-1', contextWindow: 2049},
	{name: 'gpt-4-turbo-2024-04-09', contextWindow: 2049},
	{name: 'gpt-3.5-turbo-0301', contextWindow: 4097},
	{name: 'gpt-4o-2024-08-06', contextWindow: 2049},
	{name: 'gpt-3.5-turbo-16k', contextWindow: 16385},
	{name: 'text-embedding-3-small', contextWindow: 2049},
	{name: 'gpt-3.5-turbo-1106', contextWindow: 16385},
	{name: 'gpt-3.5-turbo-instruct-0914', contextWindow: 2049},
	{name: 'gpt-4-0613', contextWindow: 8192},
	{name: 'gpt-4', contextWindow: 8192},
	{name: 'gpt-3.5-turbo-instruct', contextWindow: 4097},
	{name: 'babbage-002', contextWindow: 2049},
	{name: 'davinci-002', contextWindow: 2049},
	{name: 'dall-e-3', contextWindow: 2049},
	{name: 'gpt-4o', contextWindow: 2049},
	{name: 'gpt-4o-2024-05-13', contextWindow: 2049},
	{name: 'text-embedding-ada-002', contextWindow: 2049},
	{name: 'davinci:ft-personal-2022-12-21-07-42-15', contextWindow: 2049},
	{name: 'davinci:ft-personal-2023-02-01-18-37-38', contextWindow: 2049}
];
const perplexityModels = [
	/// Sonar Models Updated 29-sept-2024
	{name: 'llama-3.1-sonar-small-128k-online', contextWindow: 127072},
	{name: 'llama-3.1-sonar-large-128k-online', contextWindow: 127072},
	{name: 'llama-3.1-sonar-huge-128k-online', contextWindow: 127072},
	// Perplexity Chat Models
	{name: 'llama-3.1-sonar-small-128k-chat', contextWindow: 127072},
	{name: 'llama-3.1-sonar-large-128k-chat', contextWindow: 127072},
	{name: 'llama-3.1-8b-instruct', contextWindow: 131072},
	{name: 'llama-3.1-70b-instruct', contextWindow: 131072}
];
const groqModels = [
	{name: 'distil-whisper-large-v3-en', contextWindow: 448},
	{name: 'llama-3.2-1b-preview', contextWindow: 8192},
	{name: 'llama-3.1-8b-instant', contextWindow: 131072},
	{name: 'mixtral-8x7b-32768', contextWindow: 32768},
	{name: 'llama3-70b-8192', contextWindow: 8192},
	{name: 'llama3-groq-70b-8192-tool-use-preview', contextWindow: 8192},
	{name: 'llama-3.2-90b-text-preview', contextWindow: 8192},
	{name: 'whisper-large-v3', contextWindow: 448},
	{name: 'llama-3.1-70b-versatile', contextWindow: 131072},
	{name: 'llama-3.2-3b-preview', contextWindow: 8192},
	{name: 'gemma2-9b-it', contextWindow: 8192},
	{name: 'llama-guard-3-8b', contextWindow: 8192},
	{name: 'llava-v1.5-7b-4096-preview', contextWindow: 4096},
	{name: 'llama3-groq-8b-8192-tool-use-preview', contextWindow: 8192},
	{name: 'gemma-7b-it', contextWindow: 8192},
	{name: 'llama-3.2-11b-vision-preview', contextWindow: 8192},
	{name: 'llama3-8b-8192', contextWindow: 8192},
	{name: 'llama-3.2-11b-text-preview', contextWindow: 8192}
];
const googleModels = [
	{name: 'chat-bison-001', contextWindow: 4096},
	{name: 'text-bison-001', contextWindow: 8196},
	{name: 'embedding-gecko-001', contextWindow: 1024},
	{name: 'gemini-1.0-pro-latest', contextWindow: 30720},
	{name: 'gemini-1.0-pro', contextWindow: 30720},
	{name: 'gemini-pro', contextWindow: 30720},
	{name: 'gemini-1.0-pro-001', contextWindow: 30720},
	{name: 'gemini-1.0-pro-vision-latest', contextWindow: 12288},
	{name: 'gemini-pro-vision', contextWindow: 12288},
	{name: 'gemini-1.5-pro-latest', contextWindow: 2000000},
	{name: 'gemini-1.5-pro-001', contextWindow: 2000000},
	{name: 'gemini-1.5-pro-002', contextWindow: 2000000},
	{name: 'gemini-1.5-pro', contextWindow: 2000000},
	{name: 'gemini-1.5-pro-exp-0801', contextWindow: 2000000},
	{name: 'gemini-1.5-pro-exp-0827', contextWindow: 2000000},
	{name: 'gemini-1.5-flash-latest', contextWindow: 1000000},
	{name: 'gemini-1.5-flash-001', contextWindow: 1000000},
	{name: 'gemini-1.5-flash-001-tuning', contextWindow: 16384},
	{name: 'gemini-1.5-flash', contextWindow: 1000000},
	{name: 'gemini-1.5-flash-exp-0827', contextWindow: 1000000},
	{name: 'gemini-1.5-flash-8b-exp-0827', contextWindow: 1000000},
	{name: 'gemini-1.5-flash-8b-exp-0924', contextWindow: 1000000},
	{name: 'gemini-1.5-flash-002', contextWindow: 1000000},
	{name: 'gemma-2-2b-it', contextWindow: 8192},
	{name: 'gemma-2-9b-it', contextWindow: 8192},
	{name: 'gemma-2-27b-it', contextWindow: 8192},
	{name: 'embedding-001', contextWindow: 2048},
	{name: 'text-embedding-004', contextWindow: 2048},
	{name: 'aqa', contextWindow: 7168}
];
const anthropicModels = [
	{
		name: 'claude-3-5-sonnet-20240620',
		contextWindow: 8192
	},
	{
		name: 'claude-3-opus-20240229',
		contextWindow: 4096
	},
	{
		name: 'claude-3-sonnet-20240229',
		contextWindow: 4096
	},
	{
		name: 'claude-3-haiku-20240307',
		contextWindow: 4096
	},
	{
		name: 'claude-2.1',
		contextWindow: 4096
	},
	{
		name: 'claude-2.0',
		contextWindow: 4096
	},
	{
		name: 'claude-instant-1.2',
		contextWindow: 4096
	}
];

export {openAIModels, perplexityModels, groqModels, googleModels, anthropicModels};
