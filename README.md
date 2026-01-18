<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/18-XP75nUrjBRybsdsxwp2UiEkEfl29bE

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create `.env.local` with the following:
   - `LLM_API_KEY` (or `OPENAI_API_KEY`)
   - `LLM_MODEL` (optional, default `gpt-5-mini`)
   - `LLM_BASE_URL` (optional)
   - `EMBEDDING_MODEL` (optional, default `text-embedding-3-small`)
   - `CHROMA_URL` (e.g. `http://localhost:8000`)
   - `CHROMA_COLLECTION` (existing collection name)
3. Run the app:
   `npm run dev`
