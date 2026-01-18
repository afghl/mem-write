import type { RetrievalDocument, RetrievalQuery, RetrievalRepo } from '../repo/retrievalRepo';

const MOCK_DOCUMENTS: RetrievalDocument[] = [
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

export class MockRetrievalRepo implements RetrievalRepo {
    async similaritySearch({ query, limit }: RetrievalQuery) {
        const normalizedQuery = normalize(query);
        if (!normalizedQuery) return [];

        const terms = normalizedQuery.split(/\s+/).filter(Boolean);
        const scored = MOCK_DOCUMENTS.map((doc) => ({
            ...doc,
            score: scoreDocument(doc, terms),
        })).filter((doc) => (doc.score ?? 0) > 0);

        return scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, limit);
    }
}
