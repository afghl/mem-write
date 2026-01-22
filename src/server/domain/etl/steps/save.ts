import { randomUUID } from 'crypto';
import type { RetrievalRepo, RetrievalUpsertDocument } from '@/server/repo/retrievalRepo';
import type { EmbedResult, SaveResult } from '../types';

export type SaveStep = (input: EmbedResult) => Promise<SaveResult>;

export const createSaveStep = (deps: { retrievalRepo: RetrievalRepo }): SaveStep => {
    const { retrievalRepo } = deps;
    return async (input) => {
        const documents: RetrievalUpsertDocument[] = input.chunks.map((chunk, index) => ({
            id: randomUUID(),
            content: chunk,
            metadata: {
                ...input.metadata,
                sourceId: input.sourceId,
                chunkIndex: String(index),
            },
        }));

        await retrievalRepo.upsertDocuments({
            documents,
            embeddings: input.embeddings,
        });

        return { sourceId: input.sourceId, count: documents.length };
    };
};
