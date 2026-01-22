import type { SplitResult } from '../types';

export type EnrichStep = (input: SplitResult) => Promise<SplitResult>;

export const createEnrichStep = (): EnrichStep => async (input) => input;
