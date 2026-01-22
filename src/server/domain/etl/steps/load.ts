import { randomUUID } from 'crypto';
import type { LoadedSource, SourceInput } from '../types';
import { normalizeWhitespace } from '../utils';

export type PdfTextExtractor = (payload: Buffer) => Promise<string>;

export type LoadDependencies = {
    parsePdf?: PdfTextExtractor;
    fetcher?: typeof fetch;
};

export type LoadStep = (input: SourceInput) => Promise<LoadedSource>;

const defaultPdfParser: PdfTextExtractor = async (payload) => {
    const { extractText, getDocumentProxy } = await import('unpdf');
    const pdf = await getDocumentProxy(new Uint8Array(payload));
    const { text } = await extractText(pdf, { mergePages: true });
    return text ?? '';
};

const loadPdf = async (data: Buffer, parser: PdfTextExtractor) => {
    const result = await parser(data);
    return normalizeWhitespace(result ?? '');
};

const parseYouTubeVideoId = (value: string) => {
    const patterns = [
        /youtu\.be\/([^?&/]+)/i,
        /youtube\.com\/watch\?v=([^?&/]+)/i,
        /youtube\.com\/embed\/([^?&/]+)/i,
        /youtube\.com\/shorts\/([^?&/]+)/i,
    ];
    for (const pattern of patterns) {
        const match = value.match(pattern);
        if (match?.[1]) return match[1];
    }
    return null;
};

const loadYoutubeTranscript = async (
    sourceUrl: string,
    fetcher: typeof fetch,
) => {
    const apiKey = process.env.SUPEDATA_API_KEY?.trim();
    if (!apiKey) {
        throw new Error('SUPEDATA_API_KEY is not set.');
    }

    const endpoint = new URL('https://api.supadata.ai/v1/youtube/transcript');
    endpoint.searchParams.set('url', sourceUrl);
    endpoint.searchParams.set('text', 'true');

    const response = await fetcher(endpoint, {
        headers: {
            'x-api-key': apiKey,
        },
    });
    if (!response.ok) {
        throw new Error(`Supadata transcript request failed (${response.status}).`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    const payload = await response.text();
    let transcript = payload;

    if (contentType.includes('application/json')) {
        try {
            const data = JSON.parse(payload) as { text?: string } | string;
            if (typeof data === 'string') {
                transcript = data;
            } else if (typeof data?.text === 'string') {
                transcript = data.text;
            }
        } catch {
            // Fall back to raw payload if JSON parsing fails.
        }
    }

    const text = normalizeWhitespace(transcript ?? '');
    if (!text) {
        throw new Error('YouTube transcript is unavailable.');
    }
    return text;
};

export const createLoadFileStep = (deps: LoadDependencies = {}): LoadStep => {
    const parser = deps.parsePdf ?? defaultPdfParser;

    return async (input) => {
        if (input.type !== 'pdf') {
            throw new Error('Invalid source type for file loader.');
        }
        const sourceId = randomUUID();
        const text = await loadPdf(input.data, parser);
        if (!text) throw new Error('PDF content is empty.');
        return {
            sourceId,
            text,
            metadata: {
                source: input.filename,
                filename: input.filename,
                sourceType: 'pdf',
            },
        };
    };
};

export const createLoadYtbVideoStep = (deps: LoadDependencies = {}): LoadStep => {
    const fetcher = deps.fetcher ?? fetch;

    return async (input) => {
        if (input.type !== 'youtube') {
            throw new Error('Invalid source type for YouTube loader.');
        }
        const sourceId = randomUUID();
        const videoId = input.videoId || parseYouTubeVideoId(input.url);
        if (!videoId) {
            throw new Error('Invalid YouTube URL.');
        }
        const text = await loadYoutubeTranscript(input.url, fetcher);
        return {
            sourceId,
            text,
            metadata: {
                source: input.url,
                url: input.url,
                videoId,
                sourceType: 'youtube',
            },
        };
    };
};

export const isYouTubeUrl = (value: string) => Boolean(parseYouTubeVideoId(value));
export const getYouTubeVideoId = (value: string) => parseYouTubeVideoId(value);
