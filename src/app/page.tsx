"use client";

import React, { useState, useEffect } from 'react';
import { AlertCircle, Bell, BookOpen, CheckCircle2 } from 'lucide-react';
import ChatColumn from './components/home/ChatColumn';
import SourcesColumn from './components/home/SourcesColumn';
import StudioColumn from './components/home/StudioColumn';
import { streamQaChat } from '../client/agent/qaClient';
import { fetchHealthStatus } from '../client/healthClient';
import type { ChatMessage } from '../types/chat';

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

const NavBar = () => (
  <header className="flex-shrink-0 h-16 flex items-center justify-between px-6 bg-[#F0F2F5]">
    {/* Logo Area */}
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
        <BookOpen size={20} />
      </div>
      <span className="text-xl font-bold text-gray-800 tracking-tight">MemWrite</span>
      <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 rounded-full uppercase tracking-wider">MVP</span>
    </div>

    {/* Right Area: User & Actions */}
    <div className="flex items-center gap-4">
      {/* Notifications */}
      <button className="text-gray-500 hover:text-gray-700 transition-colors relative">
        <Bell size={20} />
        <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-[#F0F2F5]"></span>
      </button>

      {/* User Profile */}
      <div className="flex items-center gap-3 pl-4 border-l border-gray-300">
        <div className="text-right hidden sm:block">
          <div className="text-sm font-medium text-gray-800">Demo User</div>
          <div className="text-xs text-gray-500">Pro Plan</div>
        </div>
        <div className="w-9 h-9 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium shadow-sm ring-2 ring-white cursor-pointer hover:ring-blue-100 transition-all">
          D
        </div>
      </div>
    </div>
  </header>
);

// --- Main Page Component ---

export default function Home() {
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean, message: string, type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

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
    if (!content || isStreaming) return;
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content }]);
    setIsStreaming(true);

    try {
      await streamQaChat({
        sessionId: '123', // mock
        message: content,
        onChunk: appendAssistantChunk,
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

  return (
    <div className="flex flex-col h-screen w-full bg-[#F0F2F5] text-gray-800 font-sans overflow-hidden">

      <NavBar />

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />

      {/* Main Grid Container - Responsive adjustments included */}
      <div className="flex-1 flex overflow-hidden px-3 pb-3 gap-3">

        <SourcesColumn />
        <ChatColumn
          checkingHealth={checkingHealth}
          onSystemCheck={handleSystemCheck}
          messages={messages}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSend={() => void handleSend()}
          isStreaming={isStreaming}
        />
        <StudioColumn />
      </div>

    </div>
  );
}