export type RetrievalDocument = {
    id: string;
    content: string;
    source?: string;
    score?: number;
    metadata?: Record<string, string>;
};

export type RetrievalQuery = {
    query: string;
    limit: number;
};

export type RetrievalUpsertDocument = {
    id: string;
    content: string;
    metadata?: Record<string, string>;
};

export type RetrievalUpsertParams = {
    documents: RetrievalUpsertDocument[];
    embeddings: number[][];
};

export interface RetrievalRepo {
    similaritySearch(params: RetrievalQuery): Promise<RetrievalDocument[]>;
    upsertDocuments(params: RetrievalUpsertParams): Promise<void>;
}
