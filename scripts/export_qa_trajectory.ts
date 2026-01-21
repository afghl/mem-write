import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import type { BaseMessage } from '@langchain/core/messages';
import type { Checkpoint } from '@langchain/langgraph-checkpoint';
import { CheckpointSaver } from '../src/server/domain/agent/checkpointSaver';
import { getSupabaseHistoryRepo } from '../src/server/infra/supabaseHistoryRepo';

const projectRoot = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(projectRoot, '.env') });
dotenv.config({ path: path.join(projectRoot, '.env.local') });

const getMessageType = (message: BaseMessage) => {
    if (message.constructor?.name === 'SystemMessage') return 'system';
    if (message.constructor?.name === 'HumanMessage') return 'user';
    if (message.constructor?.name === 'AIMessage') return 'assistant';
    if (message.constructor?.name === 'AIMessageChunk') return 'assistant';
    const typed = message as { _getType?: () => string };
    const type = typeof typed._getType === 'function' ? typed._getType() : undefined;
    if (type === 'system') return 'system';
    if (type === 'human') return 'user';
    if (type === 'ai') return 'assistant';
    return message.constructor?.name ?? 'unknown';
};

const serializeMessage = (message: BaseMessage) => {
    const messageAny = message as {
        id?: string;
        content?: BaseMessage['content'];
        name?: string;
        additional_kwargs?: unknown;
        response_metadata?: unknown;
        tool_calls?: unknown;
        tool_call_chunks?: unknown;
        invalid_tool_calls?: unknown;
    };

    return {
        id: messageAny.id,
        type: getMessageType(message),
        name: messageAny.name,
        content: messageAny.content,
        additional_kwargs: messageAny.additional_kwargs,
        response_metadata: messageAny.response_metadata,
        tool_calls: messageAny.tool_calls,
        tool_call_chunks: messageAny.tool_call_chunks,
        invalid_tool_calls: messageAny.invalid_tool_calls,
    };
};

const deserialize = async <T>(saver: CheckpointSaver, value: string) =>
    (await saver.serde.loadsTyped('json', Buffer.from(value, 'base64'))) as T;

const formatBlock = (label: string, content: string) =>
    `${label} > \n\n${content}\n---\n`;

const formatMessage = (message: BaseMessage) => {
    const raw = serializeMessage(message);
    const content =
        typeof raw.content === 'string'
            ? raw.content
            : JSON.stringify(raw.content ?? null, null, 2);
    let output = formatBlock(raw.type ?? 'message', content);
    if (raw.tool_calls && Array.isArray(raw.tool_calls) && raw.tool_calls.length > 0) {
        output += formatBlock('tool_use_param', JSON.stringify(raw.tool_calls, null, 2));
    }
    if (
        raw.tool_call_chunks &&
        Array.isArray(raw.tool_call_chunks) &&
        raw.tool_call_chunks.length > 0
    ) {
        output += formatBlock('tool_use_param', JSON.stringify(raw.tool_call_chunks, null, 2));
    }
    return output;
};

async function main() {
    const threadId = process.argv[2];
    if (!threadId) {
        console.error('Usage: tsx scripts/export_qa_trajectory.ts <thread_id> [output]');
        process.exit(1);
    }

    const outputArg = process.argv[3];
    const dataDir = path.join(projectRoot, 'data');
    await fs.mkdir(dataDir, { recursive: true });

    const outputPath =
        outputArg ??
        path.join(dataDir, `qa-trajectory-${threadId.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);

    const repo = getSupabaseHistoryRepo();
    if (!repo) {
        console.error('Missing Supabase config; cannot load history.');
        process.exit(1);
    }
    const saver = new CheckpointSaver(repo);
    const rows = await repo.listCheckpoints({ threadId, options: { limit: 1 } });
    const latestRow = rows[0];
    if (!latestRow) {
        console.error(`No checkpoints found for thread_id: ${threadId}`);
        process.exit(1);
    }

    const [checkpoint, writes] = await Promise.all([
        deserialize<Checkpoint>(saver, latestRow.checkpoint),
        repo.listCheckpointWrites({
            threadId: latestRow.thread_id,
            checkpointNs: latestRow.checkpoint_ns,
            checkpointId: latestRow.checkpoint_id,
        }),
    ]);

    const channelValues = checkpoint.channel_values ?? {};
    const rawMessages = Array.isArray(channelValues.messages)
        ? (channelValues.messages as BaseMessage[])
        : [];

    let output = '';
    output += formatBlock('thread_id', threadId);
    output += formatBlock('checkpoint_id', latestRow.checkpoint_id);
    output += formatBlock('checkpoint_ns', latestRow.checkpoint_ns);

    for (const message of rawMessages) {
        output += formatMessage(message);
    }

    if (writes.length > 0) {
        output += formatBlock('tool_use_writes', JSON.stringify(writes, null, 2));
    }

    await fs.writeFile(outputPath, output, 'utf-8');
    console.log(`Trajectory exported to ${outputPath}`);
}

void main();
