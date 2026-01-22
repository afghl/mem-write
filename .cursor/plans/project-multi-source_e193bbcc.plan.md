---
name: project-multi-source
overview: Add project-scoped sources with selection-aware QA chat, backed by new Supabase tables and APIs, and move the main UI to `/project/[project_id]`.
todos:
  - id: db-schema
    content: Add Supabase migration for projects & sources tables
    status: completed
  - id: source-repo-and-api
    content: Add source repo + list sources API by project
    status: completed
  - id: upload-and-etl-linkage
    content: Store sources on upload; pass project/source ids
    status: completed
  - id: retrieval-filters
    content: Filter retrieval by project and selected IDs
    status: completed
  - id: ui-and-routing
    content: Project route UI + sources selection + chat payload
    status: completed
---

# Project-scoped Sources & Chat

## Scope decisions

- Create new Supabase tables for `projects` and `sources`, with `sources.project_id` and a `status` field.
- Use `project_id` as the scoping filter for retrieval and list APIs; use `selectedDocumentIds` to further restrict retrieval.
- Move the existing home UI to a new route and add a simple redirect from `/` to a default project id (can be updated later).

## Files to change

- Frontend routing & UI: [`src/app/page.tsx`](src/app/page.tsx), [`src/app/project/[project_id]/page.tsx`](src/app/project/%5Bproject_id%5D/page.tsx), [`src/app/components/home/SourcesColumn.tsx`](src/app/components/home/SourcesColumn.tsx), [`src/app/components/home/SourceUploadDialog.tsx`](src/app/components/home/SourceUploadDialog.tsx), [`src/app/components/home/ChatColumn.tsx`](src/app/components/home/ChatColumn.tsx)
- Frontend clients: add [`src/client/sourcesClient.ts`](src/client/sourcesClient.ts), update [`src/client/agent/qaClient.ts`](src/client/agent/qaClient.ts)
- API routes: add [`src/app/api/projects/[project_id]/sources/route.ts`](src/app/api/projects/%5Bproject_id%5D/sources/route.ts), update [`src/app/api/agent/qa/chat/route.ts`](src/app/api/agent/qa/chat/route.ts), update [`src/app/api/sources/upload/route.ts`](src/app/api/sources/upload/route.ts)
- Server services/repos: update [`src/server/services/sourceUploadService.ts`](src/server/services/sourceUploadService.ts), update [`src/server/services/qaChatService.ts`](src/server/services/qaChatService.ts), update [`src/server/domain/agent/qaAgent.ts`](src/server/domain/agent/qaAgent.ts), update retrieval path files (`src/server/domain/retrieval/*.ts`, `src/server/repo/retrievalRepo.ts`, `src/server/infra/chromaRetrievalRepo.ts`, `src/server/infra/mockRetrievalRepo.ts`)
- New source repo: add [`src/server/repo/sourceRepo.ts`](src/server/repo/sourceRepo.ts), add [`src/server/infra/supabaseSourceRepo.ts`](src/server/infra/supabaseSourceRepo.ts)
- Supabase schema: add new migration under [`supabase/migrations/`](supabase/migrations/)

## Plan

1. **DB schema (Supabase)**

- Add migration to create `projects` and `sources` tables (UUID PKs, `created_at`, `sources.project_id`, `sources.source_type`, `sources.title`, `sources.status`, optional `source_url`/`filename`).
- Add helpful indexes (`sources.project_id`, `sources.created_at`).

2. **Source repo + list API**

- Implement `SourceRepo` with `createSource`, `updateSourceStatus`, `listSourcesByProjectId` using Supabase REST (mirroring `supabaseHistoryRepo`).
- Add `GET /api/projects/[project_id]/sources` to return project-scoped sources.

3. **ETL + upload path: persist source rows**

- Extend `SourceInput` to allow `projectId` and `sourceId` so load step uses a supplied id instead of generating a new one.
- In `sourceUploadService`, create the source row with status `processing` before running ETL, run ETL with the same `sourceId`, then update status to `ready` (and optionally store chunk count).
- Update `/api/sources/upload` to require `project_id` in `formData` and pass it through.

4. **Retrieval filtering**

- Extend retrieval types to accept optional filters `{ projectId?: string; sourceIds?: string[] }`.
- Add filter support in `ChromaRetrievalRepo` via `where` and in `MockRetrievalRepo` via in-memory filtering.
- Thread filters through `retrieveDocuments` and `createRetrieveTool` so QA retrieval is scoped by `projectId` and optionally by `selectedDocumentIds`.

5. **QA chat payload updates**

- Update `qaClient.streamQaChat` and `/api/agent/qa/chat` to accept `project_id` and `selectedDocumentIds` (JSON body), with validation.
- Update `qaChatService` + `qaAgent` to pass filters into retrieval tool.

6. **Frontend routing + Sources UI**

- Move current UI to `src/app/project/[project_id]/page.tsx `and read `project_id` from params.
- Update `SourcesColumn` to fetch sources for the current project and render a selectable list with checkboxes.
- Store selected source IDs in the page component and pass into `streamQaChat`.
- Update `SourceUploadDialog` to send `project_id` in `FormData` and trigger a refresh on upload completion.
- Add a simple redirect in `src/app/page.tsx` to a default project id (e.g. `demo`) for now.

## Notes / assumptions

- Default project id: use a placeholder (e.g. `demo`) in the `/` redirect. This can be wired to real project selection later.
- `selectedDocumentIds` represent `sources.id` values (same as ETL `sourceId`) and will be stored in chroma metadata as `sourceId`.

## Tests / checks

- Add a quick manual check: open `/project/demo`, upload a PDF/YT URL, verify it appears in Sources list, select it, and ensure chat requests include `selectedDocumentIds`.
- Run `npm run lint` if needed after edits.

## Todos

- db-schema
- source-repo-and-api
- upload-and-etl-linkage
- retrieval-filters
- ui-and-routing