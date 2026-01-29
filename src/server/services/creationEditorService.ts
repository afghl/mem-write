import { streamCreationEditorEvents } from '@/server/domain/agent/creationEditorAgent';
import type { CreationEditorStreamEvent } from '@/server/domain/agent/creationEditorAgent';
import {
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

const tryParseJson = (value: string) => {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
};

const unwrapToolOutput = (value: unknown): unknown => {
  if (!value) return value;
  if (typeof value === 'string') return tryParseJson(value) ?? value;
  if (Array.isArray(value)) {
    if (value.length === 1) return unwrapToolOutput(value[0]);
    return value;
  }
  if (typeof value !== 'object') return value;

  const asRecord = value as Record<string, unknown>;
  if (Array.isArray(asRecord.messages) && asRecord.messages.length > 0) {
    return unwrapToolOutput(asRecord.messages[asRecord.messages.length - 1]);
  }
  if ('output' in asRecord) return unwrapToolOutput(asRecord.output);
  if ('content' in asRecord && typeof asRecord.content === 'string') {
    return tryParseJson(asRecord.content) ?? asRecord.content;
  }
  if ('kwargs' in asRecord) return unwrapToolOutput(asRecord.kwargs);

  return value;
};

const getToolOutput = (event: CreationEditorStreamEvent) =>
  unwrapToolOutput(event.data?.output);

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

  const streamEvents = await streamCreationEditorEvents({
    threadId,
    message,
    projectId,
    articleId: detail.article.id,
    sourceIds: detail.creation.source_ids ?? [],
  });

  const encoder = new TextEncoder();

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
              sendEvent('assistant_message', { delta: text });
              continue;
            }

            if (isToolEndEvent(event)) {
              const output = getToolOutput(event);
              if (isTextPatchOutput(output)) {
                sendEvent('text_patch', output);
                continue;
              }
              if (isContentSetOutput(output)) {
                sendEvent('content_update', { content: output.content });
              }
            }
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
