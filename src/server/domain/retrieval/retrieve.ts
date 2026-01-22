import type { RetrievalDocument, RetrievalFilters, RetrievalRepo } from '../../repo/retrievalRepo';

type RetrieveParams = {
    query: string;
    limit: number;
    filters?: RetrievalFilters;
};

export const retrieveDocuments = async (
    repo: RetrievalRepo,
    { query, limit, filters }: RetrieveParams,
): Promise<RetrievalDocument[]> => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return [];
    return repo.similaritySearch({ query: normalizedQuery, limit, filters });
};
