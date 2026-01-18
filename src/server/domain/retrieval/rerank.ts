import { getResponse } from '../../common/llm.ts';
import type { RetrievalDocument } from '../../repo/retrievalRepo';

type RerankParams = {
    query: string;
    documents: RetrievalDocument[];
    apiKey?: string;
    baseUrl?: string;
    modelName: string;
};

type ScoreItem = {
    id: string;
    score: number;
};

const MAX_CONTENT_LENGTH = 1200;

const truncate = (value: string) =>
    value.length > MAX_CONTENT_LENGTH ? `${value.slice(0, MAX_CONTENT_LENGTH)}…` : value;

const buildPrompt = (query: string, documents: RetrievalDocument[]) => {
    const payload = documents.map((doc) => ({
        id: doc.id,
        source: doc.source ?? '',
        content: truncate(doc.content),
    }));

    return [
        `Query: ${query}`,
        'Score each document for relevance to the query.',
        'Return JSON array of { "id": string, "score": number } where score is 1-5.',
        'Only return JSON, no extra text.',
        JSON.stringify(payload, null, 2),
    ].join('\n');
};

const extractJsonArray = (text: string) => {
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return null;
    try {
        return JSON.parse(match[0]);
    } catch {
        return null;
    }
};

const normalizeScore = (score: number) => Math.max(1, Math.min(5, score));

export const rerankDocuments = async ({
    query,
    documents,
    apiKey,
    baseUrl,
    modelName,
}: RerankParams): Promise<RetrievalDocument[]> => {
    if (!apiKey || documents.length <= 1) return documents;

    const response = await getResponse({
        apiKey,
        modelName,
        baseUrl,
        temperature: 0,
        systemInstructions:
            'You are a strict relevance judge. Only output valid JSON array as instructed.',
        input: buildPrompt(query, documents),
    });

    const parsed = extractJsonArray(response);
    if (!Array.isArray(parsed)) return documents;

    const scores = new Map<string, number>();
    parsed.forEach((item: ScoreItem) => {
        if (!item || typeof item.id !== 'string' || typeof item.score !== 'number') return;
        scores.set(item.id, normalizeScore(item.score));
    });

    const ranked = documents.map((doc, index) => ({
        doc,
        index,
        score: scores.get(doc.id) ?? doc.score ?? 0,
    }));

    ranked.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.index - b.index;
    });

    return ranked.map(({ doc, score }) => ({
        ...doc,
        score,
    }));
};
