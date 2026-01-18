import type { RetrievalDocument, RetrievalRepo } from '../../repo/retrievalRepo';

type RetrieveParams = {
    query: string;
    limit: number;
};

export const retrieveDocuments = async (
    repo: RetrievalRepo,
    { query, limit }: RetrieveParams,
): Promise<RetrievalDocument[]> => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return [];
    return repo.similaritySearch({ query: normalizedQuery, limit });
};
