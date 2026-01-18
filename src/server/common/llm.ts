import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

type GetResponseParams = {
    apiKey: string;
    modelName: string;
    input: string;
    baseUrl?: string;
    temperature?: number;
    systemInstructions?: string;
};

export const getResponse = async ({
    apiKey,
    modelName,
    input,
    baseUrl,
    temperature,
    systemInstructions,
}: GetResponseParams): Promise<string> => {
    const llm = new ChatOpenAI({
        modelName,
        temperature,
        openAIApiKey: apiKey,
        configuration: baseUrl ? { baseURL: baseUrl } : undefined,
    });

    const messages = systemInstructions
        ? [new SystemMessage(systemInstructions), new HumanMessage(input)]
        : [new HumanMessage(input)];
    const response = await llm.invoke(messages);
    const content = response.content;
    if (content == null || content === '') {
        throw new Error('Empty response from model.');
    }
    return String(content);
};
