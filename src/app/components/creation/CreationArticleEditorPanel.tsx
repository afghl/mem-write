import type { RefObject } from 'react';

type CreationArticleEditorPanelProps = {
  title: string;
  content: string;
  onChange: (value: string) => void;
  onSave: () => void;
  isSaving: boolean;
  lastSavedAt?: string | null;
  textareaRef?: RefObject<HTMLTextAreaElement>;
  isAnimating?: boolean;
  highlightMode?: 'pattern' | 'replacement' | null;
};

const formatSavedAt = (value?: string | null) => {
  if (!value) return '尚未保存';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '尚未保存';
  return `已保存 ${date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

export default function CreationArticleEditorPanel({
  title,
  content,
  onChange,
  onSave,
  isSaving,
  lastSavedAt,
  textareaRef,
  isAnimating = false,
  highlightMode = null,
}: CreationArticleEditorPanelProps) {
  const selectionClass =
    highlightMode === 'pattern'
      ? 'selection:bg-red-200 selection:text-red-900'
      : highlightMode === 'replacement'
        ? 'selection:bg-emerald-200 selection:text-emerald-900'
        : '';

  return (
    <div className="flex flex-col gap-3 p-4 h-full min-h-0">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title || 'Untitled'}</h2>
          <p className="text-xs text-gray-400">{formatSavedAt(lastSavedAt)}</p>
        </div>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="px-4 py-2 text-sm rounded-full bg-gray-900 text-white hover:bg-black disabled:opacity-50 transition-colors"
        >
          {isSaving ? '保存中...' : '保存'}
        </button>
      </div>
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(event) => onChange(event.target.value)}
        readOnly={isAnimating}
        placeholder="开始编写你的文章..."
        className={`flex-1 min-h-0 w-full resize-none rounded-2xl border p-4 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 ${selectionClass} ${isAnimating ? 'cursor-wait' : ''}`}
      />
    </div>
  );
}
