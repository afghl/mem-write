import { Database, Loader2, Plus, Send, Sparkles } from 'lucide-react';
import type { ChatMessage } from '../../../types/chat';

type ChatColumnProps = {
  checkingHealth: boolean;
  onSystemCheck: () => void;
  messages: ChatMessage[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  isStreaming: boolean;
};

export default function ChatColumn({
  checkingHealth,
  onSystemCheck,
  messages,
  inputValue,
  onInputChange,
  onSend,
  isStreaming,
}: ChatColumnProps) {
  return (
    <div className="flex-1 flex flex-col bg-white rounded-[24px] border border-gray-200/60 shadow-sm overflow-hidden relative">
      {/* Top Right: System Check Button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={onSystemCheck}
          disabled={checkingHealth}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 transition-colors"
        >
          {checkingHealth ? <Loader2 size={12} className="animate-spin" /> : <Database size={12} />}
          System Check
        </button>
      </div>

      {/* Main Content Area */}
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6">
            <Sparkles size={32} />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Upload a source to get started
          </h1>
          <p className="text-gray-500 max-w-md mb-8">
            MemWrite helps you understand your documents. Upload a PDF, audio file, or paste text to begin chatting.
          </p>

          <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium shadow-md transition-transform hover:scale-105 active:scale-95">
            <Plus size={18} />
            <span>Add Source</span>
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm shadow-sm whitespace-pre-wrap ${message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
                  }`}
              >
                {message.content}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Input Area */}
      <div className="p-6">
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-3xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-[28px] flex items-center p-2 transition-colors">
            <button className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 rounded-full transition-colors">
              <Plus size={20} />
            </button>
            <input
              type="text"
              placeholder="Ask anything..."
              value={inputValue}
              onChange={(event) => onInputChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  onSend();
                }
              }}
              disabled={isStreaming}
              className="flex-1 bg-transparent border-none focus:outline-none px-2 text-gray-800 placeholder-gray-400"
            />
            <button
              onClick={onSend}
              disabled={isStreaming || inputValue.trim().length === 0}
              className="p-3 bg-white shadow-sm border border-gray-100 rounded-full text-gray-800 hover:text-blue-600 disabled:opacity-40 disabled:hover:text-gray-800 transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
          <div className="text-center mt-3">
            <span className="text-[10px] text-gray-400">
              {isStreaming ? 'AI is responding...' : 'AI can make mistakes. Check important info.'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
