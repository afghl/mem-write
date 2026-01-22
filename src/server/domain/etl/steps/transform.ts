import type { SplitResult } from '../types';

export type TransformStep = (input: SplitResult) => Promise<SplitResult>;

export const createTransformStep = (): TransformStep => async (input) => input;
