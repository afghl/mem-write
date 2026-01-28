"use client";

import { type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from 'react';
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

type CreationEditorPageProps = {
  projectId?: string;
  creationId?: string;
  enableResize?: boolean;
};

const getParamValue = (value: string | string[] | undefined) => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0];
  return '';
};

export default function CreationEditorPage({
  projectId: projectIdProp,
  creationId: creationIdProp,
  enableResize = false,
}: CreationEditorPageProps) {
  const params = useParams();
  const projectId = useMemo(() => {
    if (projectIdProp) return projectIdProp;
    return getParamValue(params?.project_id);
  }, [params, projectIdProp]);
  const creationId = useMemo(() => {
    if (creationIdProp) return creationIdProp;
    return getParamValue(params?.creation_id);
  }, [params, creationIdProp]);

  const [detail, setDetail] = useState<CreationDetailResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sources, setSources] = useState<SourceSummary[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [articleContent, setArticleContent] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const rightColumnRef = useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = useState<number | null>(null);
  const [articlePanelHeight, setArticlePanelHeight] = useState<number | null>(null);

  const clampValue = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

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

  useEffect(() => {
    if (!enableResize) return;
    const container = containerRef.current;
    if (!container) return;
    requestAnimationFrame(() => {
      const { clientWidth } = container;
      setLeftWidth((prev) => prev ?? Math.round(clientWidth * 0.6));
    });
  }, [enableResize, detail?.creation.id]);

  useEffect(() => {
    if (!enableResize) return;
    const handleResize = () => {
      const container = containerRef.current;
      if (!container) return;
      const { clientWidth } = container;
      const minColumnWidth = 320;
      setLeftWidth((prev) => {
        if (!prev) return prev;
        const maxLeftWidth = Math.max(minColumnWidth, clientWidth - minColumnWidth);
        return clampValue(prev, minColumnWidth, maxLeftWidth);
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [enableResize]);

  useEffect(() => {
    if (!enableResize) return;
    const leftColumn = leftColumnRef.current;
    if (!leftColumn) return;
    const { clientHeight } = leftColumn;
    setArticlePanelHeight((prev) => prev ?? Math.round(clientHeight * 0.6));
  }, [enableResize, detail?.creation.id]);

  const handleColumnResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!enableResize) return;
    event.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const startX = event.clientX;
    const startWidth =
      leftWidth ?? leftColumnRef.current?.getBoundingClientRect().width ?? 0;
    const { clientWidth } = container;
    const minColumnWidth = 320;
    const maxLeftWidth = Math.max(minColumnWidth, clientWidth - minColumnWidth);

    const handleMove = (moveEvent: globalThis.PointerEvent) => {
      const nextWidth = startWidth + (moveEvent.clientX - startX);
      setLeftWidth(clampValue(nextWidth, minColumnWidth, maxLeftWidth));
    };

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  const handleArticleResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!enableResize) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const leftColumn = leftColumnRef.current;
    if (!leftColumn) return;
    const startY = event.clientY;
    const startHeight =
      articlePanelHeight ?? leftColumn.getBoundingClientRect().height * 0.6;
    const { clientHeight } = leftColumn;
    const minTopHeight = 220;
    const minBottomHeight = 200;
    const maxTopHeight = Math.max(minTopHeight, clientHeight - minBottomHeight);

    const handleMove = (moveEvent: globalThis.PointerEvent) => {
      const nextHeight = startHeight + (moveEvent.clientY - startY);
      setArticlePanelHeight(clampValue(nextHeight, minTopHeight, maxTopHeight));
    };

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

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
    <div
      ref={containerRef}
      className="flex-1 flex min-h-0 h-full overflow-hidden items-stretch"
    >
      <div
        ref={leftColumnRef}
        className="relative flex flex-col bg-white rounded-[14px] border border-gray-200/60 shadow-sm overflow-hidden h-full z-0"
        style={{
          width: enableResize && leftWidth ? `${leftWidth}px` : undefined,
        }}
      >
        <div
          className="flex-shrink-0"
          style={{
            height: enableResize && articlePanelHeight ? `${articlePanelHeight}px` : undefined,
          }}
        >
          <CreationArticleEditorPanel
            title={detail.article.title}
            content={articleContent}
            onChange={setArticleContent}
            onSave={handleSave}
            isSaving={isSaving}
            lastSavedAt={lastSavedAt}
          />
        </div>
        {enableResize ? (
          <div
            className="h-1 border-t cursor-row-resize transition-colors select-none touch-none pointer-events-auto"
            onPointerDown={handleArticleResizeStart}
          />
        ) : (
          <div className="h-px bg-gray-100 color-gray-100" />
        )}
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
          <CreationSourcesPanel sources={sources} />
        </div>
      </div>
      {enableResize ? (
        <div
          className="w-3 h-full cursor-col-resize transition-colors select-none touch-none pointer-events-auto flex-shrink-0 z-10 rounded-full"
          onPointerDown={handleColumnResizeStart}
        />
      ) : null}
      <div
        ref={rightColumnRef}
        className="relative flex flex-col flex-1 min-h-0 h-full z-0"
      >
        <CreationChatPanel
          messages={messages}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSend={handleSend}
          isSending={isSending}
        />
      </div>
    </div>
  );
}
