import type { RetrievalDocument, RetrievalFilters, RetrievalRepo } from '../../repo/retrievalRepo';
import { retrieveDocuments } from './retrieve.ts';
import { rerankDocuments } from './rerank.ts';

export type RagToolInput = {
    query: string;
    limit?: number;
    filters?: RetrievalFilters;
};

export type RagToolResult = {
    content: string;
    documents: RetrievalDocument[];
};

export type RagTool = {
    name: string;
    description: string;
    run: (input: RagToolInput) => Promise<RagToolResult>;
};

const DEFAULT_LIMIT = 3;
const DEFAULT_RERANK_MODEL = 'gpt-5-mini';

const getEnvValue = (key: string) => {
    const value = process.env[key];
    return value && value.trim().length > 0 ? value : undefined;
};

const serializeDocuments = (documents: RetrievalDocument[]) =>
    documents
        .map((doc) => {
            const source = doc.source ?? doc.id;
            return `Source: ${source}\nContent: ${doc.content}`;
        })
        .join('\n');

export const createRetrieveTool = (repo: RetrievalRepo): RagTool => ({
    name: 'retrieve',
    description: 'Retrieve information related to a query.',
    async run({ query, limit, filters }: RagToolInput) {
        const documents = await retrieveDocuments(repo, {
            query,
            limit: limit ?? DEFAULT_LIMIT,
            filters,
        });

        const reranked = await rerankDocuments({
            query,
            documents,
            apiKey: getEnvValue('LLM_API_KEY') ?? getEnvValue('OPENAI_API_KEY'),
            baseUrl: getEnvValue('LLM_BASE_URL') ?? getEnvValue('OPENAI_BASE_URL'),
            modelName: getEnvValue('RERANK_MODEL') ?? DEFAULT_RERANK_MODEL,
        });
        console.log('query: %s, documents: %s, one doc: %s', query, documents.length, reranked[0]);
        return {
            content: serializeDocuments(reranked),
            documents: reranked,
        };
    },
});
