import { randomUUID } from 'crypto';
import type { LoadedSource, SourceInput } from '../types';
import { decodeHtmlEntities, normalizeWhitespace } from '../utils';

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

const loadYoutubeTranscript = async (videoId: string, fetcher: typeof fetch) => {
    const transcriptUrls = [
        `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}`,
        `https://www.youtube.com/api/timedtext?lang=zh&v=${videoId}`,
        `https://www.youtube.com/api/timedtext?lang=zh-Hans&v=${videoId}`,
    ];

    for (const url of transcriptUrls) {
        const response = await fetcher(url);
        if (!response.ok) continue;
        const xml = await response.text();
        const lines: string[] = [];
        const regex = /<text[^>]*>([\s\S]*?)<\/text>/gi;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(xml)) !== null) {
            lines.push(decodeHtmlEntities(match[1] ?? ''));
        }
        const text = normalizeWhitespace(lines.join(' '));
        if (text) return text;
    }

    throw new Error('YouTube transcript is unavailable.');
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
        const text = await loadYoutubeTranscript(videoId, fetcher);
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
