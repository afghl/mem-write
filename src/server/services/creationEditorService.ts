import { streamCreationEditorEvents } from '@/server/domain/agent/creationEditorAgent';
import type { CreationEditorStreamEvent } from '@/server/domain/agent/creationEditorAgent';
import {
  appendCreationMessage,
  ensureCreationThread,
  getCreationDetail,
} from '@/server/services/creationService';

type CreationEditorStreamParams = {
  projectId: string;
  creationId: string;
  message: string;
};

type StreamResult = {
  stream: ReadableStream<Uint8Array>;
  threadId: string;
};

const getChunkText = (chunk: unknown) => {
  if (!chunk || typeof chunk !== 'object') return '';
  if (!('content' in chunk)) return '';
  const content = (chunk as { content?: unknown }).content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (!part || typeof part !== 'object') return '';
        if ('text' in part && typeof part.text === 'string') return part.text;
        return '';
      })
      .join('');
  }
  return '';
};

const isChatModelStreamEvent = (event: CreationEditorStreamEvent) =>
  event.event === 'on_chat_model_stream';

const isToolEndEvent = (event: CreationEditorStreamEvent) => event.event === 'on_tool_end';

const getLanggraphNode = (event: CreationEditorStreamEvent) => event.metadata?.langgraph_node;

const getToolOutput = (event: CreationEditorStreamEvent) => event.data?.output;

const isTextPatchOutput = (output: unknown): output is {
  type: 'text_patch';
  patch: { pattern: string; replacement: string };
  applied: boolean;
  content: string;
  match_index?: number;
  reason?: string;
} =>
  Boolean(
    output &&
    typeof output === 'object' &&
    'type' in output &&
    (output as { type?: string }).type === 'text_patch' &&
    'patch' in output,
  );

const isContentSetOutput = (output: unknown): output is { type: 'content_set'; content: string } =>
  Boolean(
    output &&
    typeof output === 'object' &&
    'type' in output &&
    (output as { type?: string }).type === 'content_set' &&
    'content' in output,
  );

export async function streamCreationEditorChat({
  projectId,
  creationId,
  message,
}: CreationEditorStreamParams): Promise<StreamResult> {
  const detail = await getCreationDetail(projectId, creationId);
  if (!detail) {
    throw new Error('Creation not found.');
  }

  const threadId =
    detail.thread_id ?? (await ensureCreationThread(projectId, creationId)) ?? '';
  if (!threadId) {
    throw new Error('Failed to resolve creation thread id.');
  }

  await appendCreationMessage({
    creationId: detail.creation.id,
    threadId,
    role: 'user',
    content: message,
  });

  const streamEvents = await streamCreationEditorEvents({
    threadId,
    message,
    projectId,
    articleId: detail.article.id,
    sourceIds: detail.creation.source_ids ?? [],
  });

  const encoder = new TextEncoder();
  let assistantText = '';

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const send = async () => {
        try {
          for await (const event of streamEvents) {
            if (isChatModelStreamEvent(event)) {
              const node = getLanggraphNode(event);
              if (node && node !== 'agent') continue;
              const text = getChunkText(event.data.chunk);
              if (!text) continue;
              assistantText += text;
              sendEvent('assistant_message', { delta: text });
              continue;
            }

            if (isToolEndEvent(event)) {
              const output = getToolOutput(event);
              if (isTextPatchOutput(output)) {
                sendEvent('text_patch', output);
                sendEvent('content_update', { content: output.content });
                continue;
              }
              if (isContentSetOutput(output)) {
                sendEvent('content_update', { content: output.content });
              }
            }
          }

          if (assistantText.trim()) {
            await appendCreationMessage({
              creationId: detail.creation.id,
              threadId,
              role: 'assistant',
              content: assistantText,
            });
          }

          sendEvent('done', { status: 'ok' });
        } catch (error) {
          console.error('Creation editor stream failed:', error);
          sendEvent('error', { message: 'Creation editor stream failed.' });
        } finally {
          controller.close();
        }
      };

      void send();
    },
  });

  return { stream, threadId };
}
