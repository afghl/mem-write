"use client";

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import type { ChatMessage } from '@/types/chat';
import type { CreationDetailResponse } from '@/client/creationClient';
import {
  fetchCreation,
  fetchCreationMessages,
  updateArticle,
} from '@/client/creationClient';
import { sendCreationChat } from '@/client/agent/creationClient';
import { fetchProjectSources, type SourceSummary } from '@/client/sourcesClient';
import CreationArticleEditorPanel from './CreationArticleEditorPanel';
import CreationSourcesPanel from './CreationSourcesPanel';
import CreationChatPanel from './CreationChatPanel';

const mapMessages = (messages: { role: string; content: string }[]) =>
  messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => ({ role: message.role as ChatMessage['role'], content: message.content }));

export default function CreationEditorPage() {
  const params = useParams();
  const projectId = useMemo(() => {
    const raw = params?.project_id;
    if (typeof raw === 'string') return raw;
    if (Array.isArray(raw)) return raw[0];
    return '';
  }, [params]);
  const creationId = useMemo(() => {
    const raw = params?.creation_id;
    if (typeof raw === 'string') return raw;
    if (Array.isArray(raw)) return raw[0];
    return '';
  }, [params]);

  const [detail, setDetail] = useState<CreationDetailResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sources, setSources] = useState<SourceSummary[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [articleContent, setArticleContent] = useState('');

  useEffect(() => {
    if (!projectId || !creationId) return;
    const loadDetail = async () => {
      const data = await fetchCreation(projectId, creationId);
      setDetail(data);
      setArticleContent(data.article.content_markdown ?? '');
      setLastSavedAt(data.article.updated_at ?? null);
    };
    void loadDetail();
  }, [projectId, creationId]);

  useEffect(() => {
    if (!projectId || !creationId) return;
    const loadMessages = async () => {
      const data = await fetchCreationMessages(projectId, creationId);
      setMessages(mapMessages(data.messages ?? []));
    };
    void loadMessages();
  }, [projectId, creationId]);

  useEffect(() => {
    if (!projectId || !detail?.creation.source_ids?.length) {
      setSources([]);
      return;
    }
    const loadSources = async () => {
      const data = await fetchProjectSources(projectId);
      const sourceIdSet = new Set(detail.creation.source_ids);
      setSources((data.sources ?? []).filter((source) => sourceIdSet.has(source.id)));
    };
    void loadSources();
  }, [projectId, detail?.creation.source_ids]);

  const handleSave = async () => {
    if (!detail || isSaving) return;
    setIsSaving(true);
    try {
      const result = await updateArticle(detail.creation.project_id, detail.article.id, articleContent);
      setLastSavedAt(result.article.updated_at ?? null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSend = async () => {
    if (!detail || isSending) return;
    const content = inputValue.trim();
    if (!content) return;
    setInputValue('');
    setMessages((prev) => [...prev, { role: 'user', content }]);
    setIsSending(true);
    try {
      const result = await sendCreationChat({
        projectId: detail.creation.project_id,
        creationId: detail.creation.id,
        message: content,
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: result.response }]);
      setArticleContent(result.article.content_markdown ?? '');
      setLastSavedAt(result.article.updated_at ?? null);
    } finally {
      setIsSending(false);
    }
  };

  if (!detail) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        正在加载创作内容...
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden gap-3">
      <div className="flex flex-col flex-1 bg-white rounded-[24px] border border-gray-200/60 shadow-sm overflow-hidden">
        <CreationArticleEditorPanel
          title={detail.article.title}
          content={articleContent}
          onChange={setArticleContent}
          onSave={handleSave}
          isSaving={isSaving}
          lastSavedAt={lastSavedAt}
        />
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <CreationSourcesPanel sources={sources} />
        </div>
      </div>
      <CreationChatPanel
        messages={messages}
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSend={handleSend}
        isSending={isSending}
      />
    </div>
  );
}
