type SourceBase = {
    sourceId?: string;
    projectId?: string;
};

export type SourceInput =
    | ({ type: 'pdf'; filename: string; data: Buffer } & SourceBase)
    | ({ type: 'youtube'; url: string; videoId: string } & SourceBase);

export type LoadedSource = {
    sourceId: string;
    text: string;
    metadata: Record<string, string>;
};

export type SplitResult = LoadedSource & {
    chunks: string[];
};

export type EmbedResult = SplitResult & {
    embeddings: number[][];
};

export type SaveResult = {
    sourceId: string;
    count: number;
};

export type TextSplitter = {
    splitText: (text: string) => Promise<string[]>;
};

export type Embedder = {
    getTextEmbedding: (text: string) => Promise<number[]>;
};

export type EtlPipeline = {
    load: (input: SourceInput) => Promise<LoadedSource>;
    split: (input: LoadedSource) => Promise<SplitResult>;
    enrich: (input: SplitResult) => Promise<SplitResult>;
    transform: (input: SplitResult) => Promise<SplitResult>;
    embed: (input: SplitResult) => Promise<EmbedResult>;
    save: (input: EmbedResult) => Promise<SaveResult>;
};

export type CreatePipelineParams = {
    embedder: Embedder;
    retrievalRepo: import('@/server/repo/retrievalRepo').RetrievalRepo;
    splitter?: TextSplitter;
};
