import { getResponse } from '@/server/common/llm';

type SummarizeSourceParams = {
    text: string;
    fallbackTitle: string;
};

export type SourceSummary = {
    title: string;
    description: string;
};

const DEFAULT_SUMMARY_MODEL = 'gpt-5-mini';
const MAX_INPUT_LENGTH = 8000;

const getEnvValue = (key: string) => {
    const value = process.env[key];
    return value && value.trim().length > 0 ? value : undefined;
};

const truncateInput = (input: string) =>
    input.length > MAX_INPUT_LENGTH ? input.slice(0, MAX_INPUT_LENGTH) : input;

const parseSummary = (content: string): SourceSummary | null => {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try {
            const parsed = JSON.parse(jsonMatch[0]);
            const title = typeof parsed.title === 'string' ? parsed.title.trim() : '';
            const description =
                typeof parsed.description === 'string' ? parsed.description.trim() : '';
            if (title) {
                return { title, description };
            }
        } catch {
            // Fall through to line parsing.
        }
    }

    const titleMatch = content.match(/Title:\s*(.+)/i);
    const descriptionMatch = content.match(/Description:\s*([\s\S]+)/i);
    if (titleMatch) {
        const title = titleMatch[1].trim();
        const description = descriptionMatch ? descriptionMatch[1].trim() : '';
        return { title, description };
    }
    return null;
};

export const summarizeSourceContent = async ({
    text,
    fallbackTitle,
}: SummarizeSourceParams): Promise<SourceSummary> => {
    const apiKey = getEnvValue('LLM_API_KEY') ?? getEnvValue('OPENAI_API_KEY');
    if (!apiKey) {
        return { title: fallbackTitle, description: '' };
    }

    const modelName =
        getEnvValue('SUMMARY_MODEL') ?? getEnvValue('LLM_MODEL') ?? DEFAULT_SUMMARY_MODEL;
    const baseUrl = getEnvValue('LLM_BASE_URL') ?? getEnvValue('OPENAI_BASE_URL');

    const systemInstructions = [
        '你是一个内容助手，需要为用户保存的资料生成摘要。',
        '请输出 JSON，格式为 {"title":"...","description":"..."}。',
        'title 不超过 20 字，description 用 1-2 句中文描述核心内容。',
        '不要输出除 JSON 之外的任何内容。',
    ].join(' ');

    const response = await getResponse({
        apiKey,
        modelName,
        input: truncateInput(text),
        baseUrl,
        temperature: 0.2,
        systemInstructions,
    });

    const parsed = parseSummary(response);
    if (parsed) return parsed;

    return { title: fallbackTitle, description: '' };
};
