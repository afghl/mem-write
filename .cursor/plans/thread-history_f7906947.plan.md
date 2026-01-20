---
name: thread-history
overview: "Implement thread-based chat history: rename session_id to thread_id, allow new threads, expose history API, and update the UI to read/write thread_id in the URL while loading past messages."
todos: []
---

# Plan for Threaded Chat History

## Approach

- Switch the chat API to accept `thread_id` in the POST body, generate one when missing, and return it in a response header so the frontend can update URL state without polluting the streamed content.
- Add a history endpoint that reconstructs chat messages from LangGraph state history for a given `thread_id` and returns messages plus minimal metadata.
- Update frontend state to read `thread_id` from the URL, fetch history when present, and persist newly created `thread_id` back into the URL after the first send.

## Key Files

- [src/app/api/agent/qa/chat/route.ts](src/app/api/agent/qa/chat/route.ts): new chat route accepting `{ thread_id?, message }`, returns `X-Thread-Id`.
- [src/server/services/qaChatService.ts](src/server/services/qaChatService.ts): rename params to `threadId` and pass through.
- [src/server/domain/agent/qaAgent.ts](src/server/domain/agent/qaAgent.ts): accept `threadId`, add helper to fetch history from LangGraph state.
- [src/app/api/agent/qa/history/route.ts](src/app/api/agent/qa/history/route.ts): new history API.
- [src/client/agent/qaClient.ts](src/client/agent/qaClient.ts) and [src/client/http.ts](src/client/http.ts): allow reading response headers from SSE and return `thread_id`.
- [src/app/page.tsx](src/app/page.tsx): parse `thread_id` from URL, fetch history, and update URL when new thread is created.

## Implementation Steps

1. **Rename identifiers** from `sessionId` to `threadId` across agent/service/client types and usage.
2. **Chat API**: create `POST /api/agent/qa/chat` that accepts `{ thread_id?: string, message }`; generate a random thread ID when missing and include it in `X-Thread-Id` response header.
3. **History extraction**: add a helper in `qaAgent.ts` to iterate `app.getStateHistory({ configurable: { thread_id } })`, extract `BaseMessage`s, drop system messages, and map to `{ role, content }`.
4. **History API**: create `GET /api/agent/qa/history?thread_id=...` returning `{ thread_id, messages, latest_checkpoint_id? }` (minimal metadata).
5. **Frontend URL state**: in `page.tsx`, read `thread_id` from `useSearchParams` on mount, store in state, and if present call `fetchQaHistory` to populate messages.
6. **Thread creation flow**: update `streamQaChat` to return the server’s `X-Thread-Id` (via an `onOpen` hook in `fetchEventStream`) and, when a new ID arrives, update state and `router.replace` to set `thread_id` in the URL.

## Notes / Assumptions

- History messages are reconstructed from LangGraph state history and only include user/assistant roles.
- Metadata in history response will be minimal (e.g., `latest_checkpoint_id`) unless more is required later.

## Todos

- `rename-thread-id`: Update backend/client types and param names to `threadId`.
- `chat-api-thread-id`: Add new chat API route with thread ID generation + header.
- `history-api`: Implement history extraction and endpoint response.
- `frontend-thread-state`: Parse `thread_id`, fetch history, and persist new IDs to URL.
- `sse-header`: Update SSE fetch to expose response headers to client.