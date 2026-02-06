export type Article = {
  id: string;
  project_id: string;
  title: string;
  content_markdown: string;
  status?: string | null;
  summary?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Creation = {
  id: string;
  project_id: string;
  article_id: string;
  style: string;
  source_ids: string[];
  thread_id?: string | null;
  created_at?: string;
  updated_at?: string;
};
