"use client";

import { FileText, MoreVertical, Plus, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import SourceUploadDialog from './SourceUploadDialog';
import { fetchProjectSources, type SourceSummary } from '@/client/sourcesClient';

type SourceItemProps = {
  id: string;
  title: string;
  date: string;
  status: string;
  checked: boolean;
  onToggle: (id: string) => void;
};

const SourceItem = ({ id, title, date, status, checked, onToggle }: SourceItemProps) => (
  <div className="group flex items-center justify-between gap-3 p-3 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors">
    <button
      type="button"
      onClick={() => onToggle(id)}
      className="flex items-center gap-3 overflow-hidden flex-1 text-left"
    >
      <input
        type="checkbox"
        checked={checked}
        onClick={(event) => event.stopPropagation()}
        onChange={() => onToggle(id)}
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-red-600">
        <FileText size={16} />
      </div>
      <div className="flex flex-col overflow-hidden">
        <span className="text-sm font-medium text-gray-800 truncate">{title}</span>
        <span className="text-xs text-gray-500">{date}</span>
      </div>
    </button>
    <div className="flex items-center gap-2">
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 uppercase">
        {status}
      </span>
      <button className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity">
        <MoreVertical size={16} />
      </button>
    </div>
  </div>
);

type SourcesColumnProps = {
  projectId: string;
  selectedSourceIds: string[];
  onSelectionChange: (next: string[]) => void;
};

const formatDateLabel = (value?: string | null) => {
  if (!value) return '刚刚';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '刚刚';
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
};

export default function SourcesColumn({
  projectId,
  selectedSourceIds,
  onSelectionChange,
}: SourcesColumnProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sources, setSources] = useState<SourceSummary[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [refreshKey, setRefreshKey] = useState(0);

  const toggleSource = useCallback(
    (id: string) => {
      const next = selectedSourceIds.includes(id)
        ? selectedSourceIds.filter((item) => item !== id)
        : [...selectedSourceIds, id];
      onSelectionChange(next);
    },
    [selectedSourceIds, onSelectionChange],
  );

  const loadSources = useCallback(async () => {
    setStatus('loading');
    try {
      const data = await fetchProjectSources(projectId);
      setSources(data.sources ?? []);
      setStatus('idle');
    } catch (error) {
      console.error('Failed to fetch sources:', error);
      setStatus('error');
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    void loadSources();
  }, [projectId, refreshKey, loadSources]);

  useEffect(() => {
    if (sources.length === 0 && selectedSourceIds.length > 0) {
      onSelectionChange([]);
      return;
    }
    const ids = new Set(sources.map((source) => source.id));
    const next = selectedSourceIds.filter((id) => ids.has(id));
    if (next.length !== selectedSourceIds.length) {
      onSelectionChange(next);
    }
  }, [sources, selectedSourceIds, onSelectionChange]);

  const items = useMemo(
    () =>
      sources.map((source) => ({
        id: source.id,
        title: source.title,
        date: formatDateLabel(source.created_at),
        status: source.status ?? 'unknown',
      })),
    [sources],
  );

  return (
    <div className="w-[280px] hidden md:flex flex-shrink-0 flex-col bg-white rounded-[24px] border border-gray-200/60 shadow-sm overflow-hidden">
      <div className="p-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Sources</h2>
        <button
          className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
          onClick={() => setIsDialogOpen(true)}
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-3 space-y-1">
        {status === 'loading' ? (
          <div className="py-6 text-center text-xs text-gray-400">加载中...</div>
        ) : null}
        {status === 'error' ? (
          <div className="py-6 text-center text-xs text-red-500">加载失败</div>
        ) : null}
        {status === 'idle' && items.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-400">暂无文档</div>
        ) : null}
        {items.map((item) => (
          <SourceItem
            key={item.id}
            id={item.id}
            title={item.title}
            date={item.date}
            status={item.status}
            checked={selectedSourceIds.includes(item.id)}
            onToggle={toggleSource}
          />
        ))}
      </div>

      <div className="p-4 border-t border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search sources"
            className="w-full bg-gray-50 border border-gray-200 rounded-full py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      <SourceUploadDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        projectId={projectId}
        onUploaded={() => setRefreshKey((value) => value + 1)}
      />
    </div>
  );
}
