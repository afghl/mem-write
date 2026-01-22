import type {
    RetrievalDocument,
    RetrievalFilters,
    RetrievalQuery,
    RetrievalRepo,
    RetrievalUpsertParams,
} from '../repo/retrievalRepo';

let mockDocuments: RetrievalDocument[] = [
    {
        id: 'doc-1',
        source: 'mock://welcome',
        content:
            'MemWrite helps users build a personal knowledge base from videos, PDFs, and unstructured sources.',
        metadata: { category: 'overview', language: 'zh' },
    },
    {
        id: 'doc-2',
        source: 'mock://features',
        content:
            'Users can ask questions on top of the knowledge base, or create new content like WeChat articles.',
        metadata: { category: 'features', language: 'zh' },
    },
    {
        id: 'doc-3',
        source: 'mock://tech',
        content: 'The stack includes Next.js 14, React 18, TypeScript, and Supabase.',
        metadata: { category: 'tech', language: 'en' },
    },
];

const normalize = (value: string) => value.trim().toLowerCase();

const scoreDocument = (doc: RetrievalDocument, terms: string[]) => {
    const haystack = normalize(
        `${doc.content} ${doc.source ?? ''} ${JSON.stringify(doc.metadata ?? {})}`,
    );
    return terms.reduce((score, term) => (haystack.includes(term) ? score + 1 : score), 0);
};

const matchesFilters = (doc: RetrievalDocument, filters?: RetrievalFilters) => {
    if (!filters) return true;
    const projectId = filters.projectId?.trim();
    const sourceIds = filters.sourceIds?.map((id) => id.trim()).filter(Boolean);
    const metadata = doc.metadata ?? {};
    const docProjectId = metadata.projectId;
    const docSourceId = metadata.sourceId ?? doc.id;

    if (projectId && docProjectId !== projectId) return false;
    if (sourceIds && sourceIds.length > 0 && !sourceIds.includes(docSourceId)) return false;
    return true;
};

export class MockRetrievalRepo implements RetrievalRepo {
    async similaritySearch({ query, limit, filters }: RetrievalQuery) {
        const normalizedQuery = normalize(query);
        if (!normalizedQuery) return [];

        const terms = normalizedQuery.split(/\s+/).filter(Boolean);
        const scored = mockDocuments
            .filter((doc) => matchesFilters(doc, filters))
            .map((doc) => ({
                ...doc,
                score: scoreDocument(doc, terms),
            }))
            .filter((doc) => (doc.score ?? 0) > 0);

        return scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, limit);
    }

    async upsertDocuments({ documents }: RetrievalUpsertParams) {
        for (const doc of documents) {
            mockDocuments.push({
                id: doc.id,
                content: doc.content,
                source: doc.metadata?.source,
                metadata: doc.metadata,
            });
        }
    }
}
