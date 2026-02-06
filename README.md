# MemWrite MVP

MemWrite is a personal knowledge base product that ingests unstructured content such as YouTube/Bilibili links and PDF files, then turns them into searchable knowledge. Users can chat and ask questions over their knowledge base, and generate derivative content (e.g. newsletters or social posts).

## Features

- Multi-source ingestion: YouTube videos and PDF files (extensible to more sources)
- Q&A and chat: retrieval + generation over project content
- Content creation: generate articles/posts from the knowledge base
- Multi-project organization: manage sources and creations by project

## Tech Stack

- Next.js 14 + React 18 + TypeScript
- Tailwind CSS + lucide-react + clsx + tailwind-merge
- Supabase (storage and data access)
- Chroma (vector retrieval)
- OpenAI or compatible APIs (LLM + embeddings)

## Project Structure

```
mem-write/
├── src/
│ ├── app/                # Next.js App Router
│ │ ├── api/              # API Routes (controllers)
│ │ └── components/       # Pure UI components
│ ├── client/             # Client fetchers / API clients
│ ├── server/             # Server-side business logic
│ │ ├── infra/            # Data access layer
│ │ ├── services/         # Domain services
│ │ ├── domain/           # Core domain logic
│ │ └── errors/           # Error types
│ ├── lib/                # Shared utilities
│ └── types/              # Shared types
├── supabase/             # Database scripts
└── ...
```

## Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies:
   `npm install`
2. Create `.env.local`:
   - Required (core)
     - `LLM_API_KEY` or `OPENAI_API_KEY`
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_ANON_KEY`
     - `CHROMA_URL`
     - `CHROMA_COLLECTION`
   - Optional (recommended)
     - `LLM_MODEL` (default `gpt-5-mini`)
     - `LLM_BASE_URL` / `OPENAI_BASE_URL`
     - `EMBEDDING_MODEL` (default `text-embedding-3-small`)
     - `CHROMA_TOKEN` or `CHROMA_API_KEY`
     - `CHROMA_TENANT` / `CHROMA_DATABASE`
     - `SUMMARY_MODEL` (summary model)
     - `RERANK_MODEL` (rerank model)
     - `SUPEDATA_API_KEY` (fetch YouTube transcripts)
     - `LANGSMITH_TRACING` / `LANGSMITH_API_KEY` / `LANGSMITH_PROJECT`
     - `LANGCHAIN_CALLBACKS_BACKGROUND` (default `false`)
3. Start the dev server:
   `npm run dev`

## Common Commands

- `npm run dev` start dev server
- `npm run build` production build
- `npm run start` run production server
- `npm run lint` lint code

## Notes

- YouTube ingestion requires `SUPEDATA_API_KEY` and will fail without it
- Retrieval/embedding depends on Chroma; missing config will break upload or retrieval
- Supabase uses REST access; prefer `SUPABASE_SERVICE_ROLE_KEY` for server-side calls

## Deployment

Recommended: Vercel

1. Set the same environment variables as `.env.local` in Vercel
2. Deploy via build trigger
