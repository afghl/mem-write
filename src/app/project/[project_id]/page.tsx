"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import ChatColumn from '@/app/components/home/ChatColumn';
import SourcesColumn from '@/app/components/home/SourcesColumn';
import StudioColumn from '@/app/components/home/StudioColumn';
import NavBar from '@/app/components/home/NavBar';
import CreationEditorModal from '@/app/components/creation/CreationEditorModal';
import { fetchQaHistory, streamQaChat } from '@/client/agent/qaClient';
import { fetchHealthStatus } from '@/client/healthClient';
import type { ChatMessage } from '@/types/chat';

// --- Components (Locally defined for MVP portability) ---

const Toast = ({ message, type, visible, onClose }: { message: string, type: 'success' | 'error', visible: boolean, onClose: () => void }) => {
  if (!visible) return null;

  return (
    <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg border animate-in fade-in slide-in-from-top-4 duration-300 ${type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
      }`}>
      {type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};


// --- Main Page Component ---

export default function ProjectPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams();
  const projectId = useMemo(() => {
    const raw = params?.project_id;
    if (typeof raw === 'string') return raw;
    if (Array.isArray(raw)) return raw[0];
    return '';
  }, [params]);

  const [checkingHealth, setCheckingHealth] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean, message: string, type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [isCreationOpen, setIsCreationOpen] = useState(false);
  const [activeCreationId, setActiveCreationId] = useState<string | null>(null);
  const loadedThreadRef = useRef<string | null>(null);
  const suppressHistoryRef = useRef<string | null>(null);

  useEffect(() => {
    setSelectedSourceIds([]);
  }, [projectId]);

  useEffect(() => {
    const urlThreadId = searchParams.get('thread_id');
    if (!urlThreadId) {
      setThreadId(null);
      loadedThreadRef.current = null;
      suppressHistoryRef.current = null;
      return;
    }

    setThreadId(urlThreadId);
    if (suppressHistoryRef.current === urlThreadId) {
      suppressHistoryRef.current = null;
      loadedThreadRef.current = urlThreadId;
      return;
    }
    if (loadedThreadRef.current === urlThreadId) return;
    loadedThreadRef.current = urlThreadId;

    const loadHistory = async () => {
      try {
        const data = await fetchQaHistory(urlThreadId);
        setMessages(data.messages ?? []);
      } catch (e) {
        setToast({
          visible: true,
          message: 'Failed to load chat history.',
          type: 'error',
        });
      }
    };

    void loadHistory();
  }, [searchParams]);

  // Auto-hide toast
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  const handleSystemCheck = async () => {
    setCheckingHealth(true);
    try {
      const data = await fetchHealthStatus();

      setToast({
        visible: true,
        message: `System Ready: DB ${data.postgres} | Vector ${data.vectorDB}`,
        type: 'success'
      });
    } catch (e) {
      setToast({
        visible: true,
        message: "System Check Failed: backend unreachable",
        type: 'error'
      });
    } finally {
      setCheckingHealth(false);
    }
  };

  const appendAssistantChunk = (chunk: string) => {
    setMessages(prev => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (!last || last.role !== 'assistant') {
        next.push({ role: 'assistant', content: chunk });
        return next;
      }
      next[next.length - 1] = { ...last, content: last.content + chunk };
      return next;
    });
  };

  const handleSend = async () => {
    const content = inputValue.trim();
    if (!content || isStreaming || !projectId) return;
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content }]);
    setIsStreaming(true);

    try {
      await streamQaChat({
        threadId,
        message: content,
        projectId,
        sourceIds: selectedSourceIds,
        onChunk: appendAssistantChunk,
        onThreadId: (nextThreadId) => {
          if (!nextThreadId || nextThreadId === threadId) return;
          suppressHistoryRef.current = nextThreadId;
          setThreadId(nextThreadId);
          const params = new URLSearchParams(searchParams.toString());
          params.set('thread_id', nextThreadId);
          router.replace(`${pathname}?${params.toString()}`);
        },
      });
    } catch (e) {
      setToast({
        visible: true,
        message: 'Chat request failed. Please try again.',
        type: 'error',
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const openCreation = (creationId: string) => {
    setActiveCreationId(creationId);
    setIsCreationOpen(true);
  };

  const closeCreation = () => {
    setIsCreationOpen(false);
  };

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500 text-sm">
        Project not found.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#F0F2F5] text-gray-800 font-sans overflow-hidden">

      <NavBar />

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />

      {/* Main Grid Container - Responsive adjustments included */}
      <div className="flex-1 flex overflow-hidden px-3 pb-3 gap-3">

        <SourcesColumn
          projectId={projectId}
          selectedSourceIds={selectedSourceIds}
          onSelectionChange={setSelectedSourceIds}
        />
        <ChatColumn
          checkingHealth={checkingHealth}
          onSystemCheck={handleSystemCheck}
          messages={messages}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSend={() => void handleSend()}
          isStreaming={isStreaming}
        />
        <StudioColumn projectId={projectId} onOpenCreation={openCreation} />
      </div>

      <CreationEditorModal
        open={isCreationOpen}
        onClose={closeCreation}
        projectId={projectId}
        creationId={activeCreationId}
      />
    </div>
  );
}
