"use client";

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { fetchProjectSources, type SourceSummary } from '@/client/sourcesClient';
import { createCreation } from '@/client/creationClient';

type CreationStartDialogProps = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  initialStyle?: string | null;
  onCreated: (creationId: string) => void;
};

const STYLE_OPTIONS = ['WeChat Article', 'RedNote Post', 'Summary'];

export default function CreationStartDialog({
  open,
  onClose,
  projectId,
  initialStyle,
  onCreated,
}: CreationStartDialogProps) {
  const [style, setStyle] = useState('');
  const [sources, setSources] = useState<SourceSummary[]>([]);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStyle(initialStyle ?? '');
    setSelectedSourceIds([]);
    setError(null);
    setIsSubmitting(false);
    const loadSources = async () => {
      const data = await fetchProjectSources(projectId);
      setSources(data.sources ?? []);
    };
    void loadSources();
  }, [open, projectId, initialStyle]);

  useEffect(() => {
    if (!open) return;
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [open, onClose]);

  const canSubmit = useMemo(() => {
    return style.trim().length > 0 && selectedSourceIds.length > 0 && !isSubmitting;
  }, [style, selectedSourceIds, isSubmitting]);

  const toggleSource = (id: string) => {
    setSelectedSourceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await createCreation(projectId, {
        style,
        source_ids: selectedSourceIds,
      });
      onCreated(result.creation.id);
      onClose();
    } catch (submitError) {
      console.error('Create creation failed:', submitError);
      setError('创建失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} role="presentation" />
      <div
        className="relative w-full max-w-2xl mx-4 rounded-2xl bg-white shadow-xl border border-gray-200"
        role="dialog"
        aria-modal="true"
        aria-label="Create article dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">创建文章</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-700">选择文章风格</div>
            <div className="space-y-2">
              {STYLE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setStyle(option)}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                    style === option
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-700">选择引用 Sources</div>
            <div className="max-h-[260px] overflow-y-auto rounded-xl border border-gray-200 p-3 space-y-2">
              {sources.length === 0 ? (
                <div className="text-xs text-gray-400">暂无可选来源</div>
              ) : (
                sources.map((source) => (
                  <label
                    key={source.id}
                    className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSourceIds.includes(source.id)}
                      onChange={() => toggleSource(source.id)}
                      className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                    />
                    <span className="truncate">{source.title}</span>
                  </label>
                ))
              )}
            </div>
            <div className="text-xs text-gray-400">
              至少选择 1 个 source 才能开始创作
            </div>
          </div>
        </div>

        {error ? <div className="px-6 text-sm text-red-500">{error}</div> : null}

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-gray-900 hover:bg-black disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? '创建中...' : '创建'}
          </button>
        </div>
      </div>
    </div>
  );
}
