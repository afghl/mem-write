import { OpenAIEmbedding } from '@llamaindex/openai';
import { ChromaRetrievalRepo } from '@/server/infra/chromaRetrievalRepo';
import { createFilePipeline, createYoutubePipeline, runEtlPipeline } from '@/server/domain/etl/pipeline';
import type { SourceInput } from '@/server/domain/etl/types';
import { getYouTubeVideoId } from '@/server/domain/etl/steps/load';

type UploadSourcePayload = {
    file?: {
        filename: string;
        data: Buffer;
    };
    url?: string;
};

const getEnvValue = (key: string) => {
    const value = process.env[key];
    return value && value.trim().length > 0 ? value : undefined;
};

const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';

const createChromaRetrievalRepo = () => {
    const chromaUrl = getEnvValue('CHROMA_URL');
    const chromaCollection = getEnvValue('CHROMA_COLLECTION');
    if (!chromaUrl || !chromaCollection) {
        throw new Error('Missing Chroma configuration.');
    }

    const apiKey = getEnvValue('LLM_API_KEY') ?? getEnvValue('OPENAI_API_KEY');
    if (!apiKey) {
        throw new Error('Missing embedding API key.');
    }

    return new ChromaRetrievalRepo({
        url: chromaUrl,
        collection: chromaCollection,
        apiKey,
        baseUrl: getEnvValue('LLM_BASE_URL') ?? getEnvValue('OPENAI_BASE_URL'),
        embeddingModel: getEnvValue('EMBEDDING_MODEL'),
        chromaToken: getEnvValue('CHROMA_TOKEN') ?? getEnvValue('CHROMA_API_KEY'),
        chromaTenant: getEnvValue('CHROMA_TENANT'),
        chromaDatabase: getEnvValue('CHROMA_DATABASE'),
    });
};

const createEmbedder = () => {
    const apiKey = getEnvValue('LLM_API_KEY') ?? getEnvValue('OPENAI_API_KEY');
    if (!apiKey) {
        throw new Error('Missing embedding API key.');
    }

    return new OpenAIEmbedding({
        apiKey,
        model: getEnvValue('EMBEDDING_MODEL') ?? DEFAULT_EMBEDDING_MODEL,
        baseURL: getEnvValue('LLM_BASE_URL') ?? getEnvValue('OPENAI_BASE_URL'),
    });
};

export async function enqueueSourceUpload(payload: UploadSourcePayload) {
    const retrievalRepo = createChromaRetrievalRepo();
    const embedder = createEmbedder();

    if (payload.file) {
        const pipeline = createFilePipeline({ embedder, retrievalRepo });
        const source: SourceInput = {
            type: 'pdf',
            filename: payload.file.filename,
            data: payload.file.data,
        };
        return runEtlPipeline(pipeline, source);
    }

    if (payload.url) {
        const videoId = getYouTubeVideoId(payload.url);
        if (!videoId) {
            throw new Error('Only YouTube URLs are supported.');
        }
        const pipeline = createYoutubePipeline({ embedder, retrievalRepo });
        const source: SourceInput = {
            type: 'youtube',
            url: payload.url,
            videoId,
        };
        return runEtlPipeline(pipeline, source);
    }

    throw new Error('Missing source input.');
}
