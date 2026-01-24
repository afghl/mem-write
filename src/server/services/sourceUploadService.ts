import { OpenAIEmbedding } from '@llamaindex/openai';
import { randomUUID } from 'crypto';
import { ChromaRetrievalRepo } from '@/server/infra/chromaRetrievalRepo';
import {
    createFilePipeline,
    createYoutubePipeline,
    runEtlPipeline,
    runEtlPipelineFromLoaded,
} from '@/server/domain/etl/pipeline';
import type { LoadedSource, SourceInput } from '@/server/domain/etl/types';
import { getYouTubeVideoId } from '@/server/domain/etl/steps/load';
import { summarizeSourceContent } from '@/server/domain/source/summarize';
import { getSupabaseSourceRepo } from '@/server/infra/supabaseSourceRepo';

type UploadSourcePayload = {
    projectId: string;
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

const runPipelineWithStatus = async (
    sourceRepo: ReturnType<typeof getSupabaseSourceRepo>,
    sourceId: string,
    pipeline: ReturnType<typeof createFilePipeline> | ReturnType<typeof createYoutubePipeline>,
    source?: SourceInput,
    loaded?: LoadedSource,
) => {
    if (!sourceRepo) {
        throw new Error('Supabase is not configured for source storage.');
    }

    try {
        const result = loaded
            ? await runEtlPipelineFromLoaded(pipeline, loaded)
            : await runEtlPipeline(pipeline, source as SourceInput);
        await sourceRepo.updateSourceStatus({
            id: sourceId,
            status: 'ready',
            chunk_count: result.count,
        });
        return result;
    } catch (error) {
        await sourceRepo.updateSourceStatus({ id: sourceId, status: 'failed' });
        throw error;
    }
};

export async function enqueueSourceUpload(payload: UploadSourcePayload) {
    const sourceRepo = getSupabaseSourceRepo();
    if (!sourceRepo) {
        throw new Error('Supabase is not configured for source storage.');
    }

    const retrievalRepo = createChromaRetrievalRepo();
    const embedder = createEmbedder();
    const sourceId = randomUUID();

    if (payload.file) {
        const pipeline = createFilePipeline({ embedder, retrievalRepo });
        const source: SourceInput = {
            type: 'pdf',
            filename: payload.file.filename,
            data: payload.file.data,
            sourceId,
            projectId: payload.projectId,
        };
        const loaded = await pipeline.load(source);
        const fallbackTitle = payload.file.filename;
        let summary = { title: fallbackTitle, description: '' };
        try {
            summary = await summarizeSourceContent({
                text: loaded.text,
                fallbackTitle,
            });
        } catch (error) {
            console.warn('Failed to summarize source content:', error);
        }
        await sourceRepo.createSource({
            id: sourceId,
            project_id: payload.projectId,
            source_type: 'pdf',
            title: summary.title,
            description: summary.description,
            filename: payload.file.filename,
            status: 'processing',
        });
        return runPipelineWithStatus(sourceRepo, sourceId, pipeline, source, loaded);
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
            sourceId,
            projectId: payload.projectId,
        };
        const loaded = await pipeline.load(source);
        const fallbackTitle = payload.url;
        let summary = { title: fallbackTitle, description: '' };
        try {
            summary = await summarizeSourceContent({
                text: loaded.text,
                fallbackTitle,
            });
        } catch (error) {
            console.warn('Failed to summarize source content:', error);
        }
        await sourceRepo.createSource({
            id: sourceId,
            project_id: payload.projectId,
            source_type: 'youtube',
            title: summary.title,
            description: summary.description,
            source_url: payload.url,
            status: 'processing',
        });
        return runPipelineWithStatus(sourceRepo, sourceId, pipeline, source, loaded);
    }

    throw new Error('Missing source input.');
}
