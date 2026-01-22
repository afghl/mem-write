import type { Embedder, EmbedResult, SplitResult } from '../types';

export type EmbedStep = (input: SplitResult) => Promise<EmbedResult>;

export const createEmbedStep = (deps: { embedder: Embedder }): EmbedStep => {
    const { embedder } = deps;
    return async (input) => {
        const embeddings = await Promise.all(
            input.chunks.map((chunk) => embedder.getTextEmbedding(chunk)),
        );
        return { ...input, embeddings };
    };
};
