export type ArticleRow = {
  id: string;
  project_id: string;
  title: string;
  content_markdown: string;
  status?: string | null;
  summary?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CreationRow = {
  id: string;
  project_id: string;
  article_id: string;
  style: string;
  source_ids: string[];
  thread_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CreateArticleInput = {
  project_id: string;
  title: string;
  content_markdown?: string;
  status?: string | null;
  summary?: string | null;
};

export type UpdateArticleContentInput = {
  id: string;
  project_id: string;
  content_markdown: string;
};

export type CreateCreationInput = {
  project_id: string;
  article_id: string;
  style: string;
  source_ids: string[];
  thread_id?: string | null;
};

export type UpdateCreationInput = {
  id: string;
  project_id: string;
  style?: string;
  source_ids?: string[];
  thread_id?: string | null;
};

export type CreationRepo = {
  createArticle: (input: CreateArticleInput) => Promise<ArticleRow>;
  getArticleById: (projectId: string, articleId: string) => Promise<ArticleRow | undefined>;
  updateArticleContent: (input: UpdateArticleContentInput) => Promise<ArticleRow | undefined>;
  listArticlesByIds: (projectId: string, articleIds: string[]) => Promise<ArticleRow[]>;
  createCreation: (input: CreateCreationInput) => Promise<CreationRow>;
  getCreationById: (projectId: string, creationId: string) => Promise<CreationRow | undefined>;
  getCreationByThreadId: (threadId: string) => Promise<CreationRow | undefined>;
  listCreationsByProjectId: (projectId: string) => Promise<CreationRow[]>;
  updateCreation: (input: UpdateCreationInput) => Promise<CreationRow | undefined>;
};
