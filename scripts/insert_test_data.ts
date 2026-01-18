import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { OpenAIEmbedding } from '@llamaindex/openai';
import { CloudClient } from 'chromadb';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

type TestDataItem = {
    lang?: string;
    text?: string;
};

type TestData = {
    lang?: string;
    content?: TestDataItem[];
};

const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';
const DEFAULT_CHUNK_SIZE = 800;
const DEFAULT_CHUNK_OVERLAP = 120;
const DEFAULT_BATCH_SIZE = 50;

const getEnvValue = (key: string) => {
    const value = process.env[key];
    return value && value.trim().length > 0 ? value : undefined;
};

const getNumberEnv = (key: string, fallback: number) => {
    const raw = getEnvValue(key);
    if (!raw) return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const aggregateText = (items: TestDataItem[]) =>
    items
        .map((item) => (item.text ?? '').trim())
        .filter((text) => text.length > 0)
        .join(' ');

const buildIds = (startIndex: number, batchSize: number) =>
    Array.from({ length: batchSize }, (_, index) => `test-data-${startIndex + index}`);

const normalizeTokenHeader = (value?: string) => {
    if (!value) return undefined;
    const normalized = value.trim().toUpperCase();
    if (normalized === 'AUTHORIZATION' || normalized === 'X_CHROMA_TOKEN') {
        return normalized as 'AUTHORIZATION' | 'X_CHROMA_TOKEN';
    }
    return undefined;
};

const main = async () => {
    const filePath = path.resolve(process.cwd(), 'data', 'test_data.json');
    const raw = await readFile(filePath, 'utf-8');
    const data = JSON.parse(raw) as TestData;
    const items = data.content ?? [];
    if (items.length === 0) {
        throw new Error('No content found in data/test_data.json.');
    }
    const aggregated = aggregateText(items);
    if (!aggregated) {
        throw new Error('Aggregated text is empty.');
    }

    const chunkSize = getNumberEnv('CHUNK_SIZE', DEFAULT_CHUNK_SIZE);
    const chunkOverlap = getNumberEnv('CHUNK_OVERLAP', DEFAULT_CHUNK_OVERLAP);
    const batchSize = getNumberEnv('CHROMA_BATCH_SIZE', DEFAULT_BATCH_SIZE);

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize,
        chunkOverlap,
    });

    const chunks = await splitter.splitText(aggregated);
    if (chunks.length === 0) {
        throw new Error('No chunks generated from aggregated text.');
    }

    const chromaUrl = getEnvValue('CHROMA_URL');
    const chromaCollection = getEnvValue('CHROMA_COLLECTION');
    if (!chromaUrl || !chromaCollection) {
        throw new Error('Missing CHROMA_URL or CHROMA_COLLECTION.');
    }

    const apiKey = getEnvValue('LLM_API_KEY') ?? getEnvValue('OPENAI_API_KEY');
    if (!apiKey) {
        throw new Error('Missing LLM_API_KEY or OPENAI_API_KEY.');
    }

    const embedModel = new OpenAIEmbedding({
        apiKey,
        model: getEnvValue('EMBEDDING_MODEL') ?? DEFAULT_EMBEDDING_MODEL,
        baseURL: getEnvValue('LLM_BASE_URL') ?? getEnvValue('OPENAI_BASE_URL'),
    });

    const chromaToken = getEnvValue('CHROMA_TOKEN');
    const chromaTenant = getEnvValue('CHROMA_TENANT');
    const chromaDatabase = getEnvValue('CHROMA_DATABASE');

    const client = new CloudClient({
        apiKey: chromaToken,
        tenant: chromaTenant,
        database: chromaDatabase
    });
    const collection = await client.getOrCreateCollection({ name: chromaCollection });

    for (let start = 0; start < chunks.length; start += batchSize) {
        const batch = chunks.slice(start, start + batchSize);
        const embeddings = await Promise.all(batch.map((text) => embedModel.getTextEmbedding(text)));
        const ids = buildIds(start, batch.length);
        const metadatas = batch.map((_, index) => ({
            source: 'data/test_data.json',
            chunkIndex: start + index,
            totalChunks: chunks.length,
            lang: data.lang,
        }));

        await collection.add({
            ids,
            documents: batch,
            embeddings,
            metadatas,
        });

        console.log(`Inserted ${start + batch.length}/${chunks.length} chunks...`);
    }

    const count = await collection.count();
    console.log(`Done. Collection "${chromaCollection}" now has ${count} items.`);
};

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
