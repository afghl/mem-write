import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import type { LoadedSource, SplitResult, TextSplitter } from '../types';
import { normalizeWhitespace } from '../utils';

export type SplitStep = (input: LoadedSource) => Promise<SplitResult>;

const createDefaultSplitter = () =>
    new RecursiveCharacterTextSplitter({
        chunkSize: 800,
        chunkOverlap: 120,
    });

export const createSplitStep = (options: { splitter?: TextSplitter } = {}): SplitStep => {
    const splitter = options.splitter ?? createDefaultSplitter();
    return async (input) => {
        const docs = await splitter.splitText(input.text);
        const chunks = docs.map((chunk) => normalizeWhitespace(chunk)).filter(Boolean);
        return { ...input, chunks };
    };
};
