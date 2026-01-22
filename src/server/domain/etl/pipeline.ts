import type { CreatePipelineParams, EtlPipeline, SourceInput } from './types';
import { createLoadFileStep, createLoadYtbVideoStep } from './steps/load';
import { createSplitStep } from './steps/split';
import { createEnrichStep } from './steps/enrich';
import { createTransformStep } from './steps/transform';
import { createEmbedStep } from './steps/embed';
import { createSaveStep } from './steps/save';

export const createFilePipeline = ({
    embedder,
    retrievalRepo,
    splitter,
}: CreatePipelineParams): EtlPipeline => ({
    load: createLoadFileStep(),
    split: createSplitStep({ splitter }),
    enrich: createEnrichStep(),
    transform: createTransformStep(),
    embed: createEmbedStep({ embedder }),
    save: createSaveStep({ retrievalRepo }),
});

export const createYoutubePipeline = ({
    embedder,
    retrievalRepo,
    splitter,
}: CreatePipelineParams): EtlPipeline => ({
    load: createLoadYtbVideoStep(),
    split: createSplitStep({ splitter }),
    enrich: createEnrichStep(),
    transform: createTransformStep(),
    embed: createEmbedStep({ embedder }),
    save: createSaveStep({ retrievalRepo }),
});

export const runEtlPipeline = async (pipeline: EtlPipeline, source: SourceInput) => {
    const loaded = await pipeline.load(source);
    const split = await pipeline.split(loaded);
    const enriched = await pipeline.enrich(split);
    const transformed = await pipeline.transform(enriched);
    const embedded = await pipeline.embed(transformed);
    return pipeline.save(embedded);
};
