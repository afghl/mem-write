import { Send } from 'lucide-react';
import type { ChatMessage } from '@/types/chat';

type CreationChatPanelProps = {
  messages: ChatMessage[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  isSending: boolean;
};

export default function CreationChatPanel({
  messages,
  inputValue,
  onInputChange,
  onSend,
  isSending,
}: CreationChatPanelProps) {
  return (
    <div className="flex-1 flex flex-col bg-white rounded-[14px] border border-gray-200/60 shadow-sm overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-sm text-gray-400 text-center pt-20">从这里开始你的创作对话</div>
        ) : null}
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm shadow-sm whitespace-pre-wrap ${message.role === 'user'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-800'
                }`}
            >
              {message.content}
            </div>
          </div>
        ))}
      </div>

      <div className="p-6 border-t border-gray-100">
        <div className="relative">
          <input
            type="text"
            placeholder="给创作助手一个指令..."
            value={inputValue}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onSend();
              }
            }}
            disabled={isSending}
            className="w-full bg-gray-50 border border-gray-200 rounded-full py-3 pl-5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all"
          />
          <button
            onClick={onSend}
            disabled={isSending || inputValue.trim().length === 0}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-gray-900 text-white hover:bg-black disabled:opacity-40 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
        <div className="text-center mt-3">
          <span className="text-[10px] text-gray-400">
            {isSending ? '创作中...' : 'AI 可能会出错，请核对重要信息。'}
          </span>
        </div>
      </div>
    </div>
  );
}
