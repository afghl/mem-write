import { OpenAIEmbedding } from '@llamaindex/openai';
import { CloudClient } from 'chromadb';

import type {
    RetrievalDocument,
    RetrievalQuery,
    RetrievalRepo,
    RetrievalUpsertParams,
} from '../repo/retrievalRepo';

type ChromaRetrievalRepoConfig = {
    url: string;
    collection: string;
    apiKey: string;
    baseUrl?: string;
    embeddingModel?: string;
    chromaToken?: string;
    chromaTenant?: string;
    chromaDatabase?: string;
};

type ChromaMetadata = Record<string, unknown>;

type ChromaQueryResult = {
    ids: string[][];
    documents?: (string | null)[][];
    metadatas?: ChromaMetadata[][];
    distances?: number[][];
};

type ChromaCollection = Awaited<ReturnType<CloudClient['getCollection']>>;

const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';

const toStringRecord = (value?: ChromaMetadata | null) => {
    if (!value) return undefined;
    return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, entry == null ? '' : String(entry)]),
    );
};

const distanceToScore = (distance?: number) => {
    if (typeof distance !== 'number') return undefined;
    return 1 / (1 + distance);
};

export class ChromaRetrievalRepo implements RetrievalRepo {
    private readonly client: CloudClient;
    private readonly collectionName: string;
    private readonly embedModel: OpenAIEmbedding;
    private collectionPromise?: Promise<ChromaCollection>;

    constructor(config: ChromaRetrievalRepoConfig) {
        const {
            collection,
            apiKey,
            baseUrl,
            embeddingModel,
            chromaToken,
            chromaTenant,
            chromaDatabase,
        } = config;

        this.client = new CloudClient({
            apiKey: chromaToken,
            tenant: chromaTenant,
            database: chromaDatabase,
        });
        this.collectionName = collection;
        this.embedModel = new OpenAIEmbedding({
            apiKey,
            model: embeddingModel ?? DEFAULT_EMBEDDING_MODEL,
            baseURL: baseUrl,
        });
    }

    private async getCollection() {
        if (!this.collectionPromise) {
            this.collectionPromise = this.client.getOrCreateCollection({
                name: this.collectionName,
            });
        }
        return this.collectionPromise;
    }

    async similaritySearch({ query, limit }: RetrievalQuery): Promise<RetrievalDocument[]> {
        const normalizedQuery = query.trim();
        if (!normalizedQuery) return [];

        const [collection, embedding] = await Promise.all([
            this.getCollection(),
            this.embedModel.getTextEmbedding(normalizedQuery),
        ]);

        const result = (await collection.query({
            queryEmbeddings: [embedding],
            nResults: limit,
            include: ['documents', 'metadatas', 'distances'],
        })) as ChromaQueryResult;

        const ids = result.ids?.[0] ?? [];
        const documents = result.documents?.[0] ?? [];
        const metadatas = result.metadatas?.[0] ?? [];
        const distances = result.distances?.[0] ?? [];

        return ids.map((id, index) => {
            const metadata = toStringRecord(metadatas[index]);
            const source = metadata?.source ?? metadata?.url ?? metadata?.path;
            return {
                id,
                content: documents[index] ?? '',
                source,
                score: distanceToScore(distances[index]),
                metadata,
            };
        });
    }

    async upsertDocuments({ documents, embeddings }: RetrievalUpsertParams): Promise<void> {
        if (documents.length === 0) return;
        if (documents.length !== embeddings.length) {
            throw new Error('Embeddings length must match documents length.');
        }

        const collection = await this.getCollection();
        const ids = documents.map((doc) => doc.id);
        const contents = documents.map((doc) => doc.content);
        const metadatas = documents.map((doc) => toStringRecord(doc.metadata) ?? {});

        await collection.add({
            ids,
            embeddings,
            documents: contents,
            metadatas,
        });
    }
}
