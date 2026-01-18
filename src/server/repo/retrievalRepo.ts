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

export interface RetrievalRepo {
    similaritySearch(params: RetrievalQuery): Promise<RetrievalDocument[]>;
}
