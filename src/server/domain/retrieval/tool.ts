import type { RetrievalDocument, RetrievalRepo } from '../../repo/retrievalRepo';

export type RagToolInput = {
    query: string;
    limit?: number;
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

const serializeDocuments = (documents: RetrievalDocument[]) =>
    documents
        .map((doc) => {
            const source = doc.source ?? doc.id;
            return `Source: ${source}\nContent: ${doc.content}`;
        })
        .join('\n');

export const createRagTool = (repo: RetrievalRepo): RagTool => ({
    name: 'retrieve',
    description: 'Retrieve information related to a query.',
    async run({ query, limit }: RagToolInput) {
        const documents = await repo.similaritySearch({
            query,
            limit: limit ?? DEFAULT_LIMIT,
        });

        return {
            content: serializeDocuments(documents),
            documents,
        };
    },
});
