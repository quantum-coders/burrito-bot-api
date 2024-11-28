import 'dotenv/config';

import OpenAIService from '#services/openai.service.js';
import ChromaService from '#services/chroma.service.js';
import aiPrompts from '#ai/prompts.js';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

class PaigeService {

	static async updateEntityStructure(prompt) {

		const editEntity = await OpenAIService.sendMessage({
			system: aiPrompts.editEntityStructure,
			prompt,
		});
	}

	static async embedPdf(pdf, chunkSize = 1000) {

		const pdfData = await pdfParse(pdf);
		const pdfText = pdfData.text.trim();

		if(!pdfText) throw new Error('No text found in the PDF');

		const chunks = this.splitTextIntoChunks(pdfText, chunkSize);
		
		ChromaService.init();

		const embedder = ChromaService.createEmbedder('openai', 'text-embedding-3-small');
		const collection = await ChromaService.createOrGetCollection('paige-test', { embeddingFunction: embedder });

		const embeddingPromises = chunks.map(async (chunk, index) => {

			const embedding = await OpenAIService.generateEmbedding(chunk);

			await collection.add({
				ids: [ `pdf-chunk-${ Date.now() }-${ index }` ],
				embeddings: [ embedding ],
				metadatas: [ { chunkIndex: index } ],
				documents: [ chunk ],
			});
		});

		await Promise.all(embeddingPromises);
	}

	static splitTextIntoChunks(text, chunkSize = 1000) {
		const chunks = [];
		let start = 0;

		while(start < text.length) {
			// Find the next chunk ending at the closest sentence boundary
			let end = start + chunkSize;
			if(end < text.length) {
				const lastPeriod = text.lastIndexOf('.', end);
				end = lastPeriod > start ? lastPeriod + 1 : end;
			}
			chunks.push(text.slice(start, end).trim());
			start = end;
		}

		return chunks;
	}
}

export default PaigeService;