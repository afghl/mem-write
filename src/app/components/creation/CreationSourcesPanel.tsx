import { FileText } from 'lucide-react';
import type { SourceSummary } from '@/client/sourcesClient';

type CreationSourcesPanelProps = {
  sources: SourceSummary[];
};

const formatDateLabel = (value?: string | null) => {
  if (!value) return '刚刚';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '刚刚';
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
};

export default function CreationSourcesPanel({ sources }: CreationSourcesPanelProps) {
  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">引用 Sources</h3>
        <span className="text-xs text-gray-400">{sources.length} 个</span>
      </div>
      {sources.length === 0 ? (
        <div className="text-xs text-gray-400">暂无引用的来源</div>
      ) : (
        <div className="space-y-2">
          {sources.map((source) => (
            <div
              key={source.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <FileText size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">
                  {source.title}
                </div>
                <div className="text-xs text-gray-500">
                  {formatDateLabel(source.created_at)} · {source.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
