"use client";

import { FileText, MessageSquare, PenTool, Share2, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import CreationStartDialog from './CreationStartDialog';
import { fetchProjectCreations, type CreationListItem } from '@/client/creationClient';

type StudioCardProps = {
  title: string;
  icon: ReactNode;
  color: string;
  onClick?: () => void;
};

const StudioCard = ({ title, icon, color, onClick }: StudioCardProps) => (
  <button
    type="button"
    onClick={onClick}
    className="p-4 rounded-2xl border border-gray-200 bg-white hover:shadow-md transition-shadow cursor-pointer flex flex-col gap-3 text-left"
  >
    <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center`}>
      {icon}
    </div>
    <h3 className="font-medium text-gray-800">{title}</h3>
    <div className="h-2 w-16 bg-gray-100 rounded-full mt-auto"></div>
  </button>
);

type StudioColumnProps = {
  projectId: string;
  onOpenCreation?: (creationId: string) => void;
};

const formatDateLabel = (value?: string | null) => {
  if (!value) return '刚刚';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '刚刚';
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
};

const STYLE_PRESETS = [
  { label: 'WeChat Article', icon: MessageSquare, color: 'bg-green-100' },
  { label: 'RedNote Post', icon: FileText, color: 'bg-red-100' },
  { label: 'Summary', icon: Sparkles, color: 'bg-purple-100' },
];

export default function StudioColumn({ projectId, onOpenCreation }: StudioColumnProps) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogStyle, setDialogStyle] = useState<string | null>(null);
  const [creations, setCreations] = useState<CreationListItem[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!projectId) return;
    const loadCreations = async () => {
      setStatus('loading');
      try {
        const data = await fetchProjectCreations(projectId);
        setCreations(data.creations ?? []);
        setStatus('idle');
      } catch (error) {
        console.error('Failed to fetch creations:', error);
        setStatus('error');
      }
    };
    void loadCreations();
  }, [projectId, refreshKey]);

  const openDialog = (style?: string) => {
    setDialogStyle(style ?? null);
    setIsDialogOpen(true);
  };

  const handleCreated = (creationId: string) => {
    setRefreshKey((value) => value + 1);
    if (onOpenCreation) {
      onOpenCreation(creationId);
      return;
    }
    router.push(`/project/${projectId}/creation/${creationId}`);
  };

  const items = useMemo(
    () =>
      creations.map((item) => ({
        id: item.creation.id,
        title: item.article_title,
        date: formatDateLabel(item.article_updated_at),
        style: item.creation.style,
      })),
    [creations],
  );

  return (
    <div className="w-[320px] hidden lg:flex flex-shrink-0 flex-col bg-white rounded-[24px] border border-gray-200/60 shadow-sm overflow-hidden relative">
      <div className="p-5 flex items-center justify-between border-b border-gray-50">
        <h2 className="text-xl font-semibold text-gray-800">Studio</h2>
        <button className="text-gray-400 hover:text-gray-600">
          <Share2 size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4">
        <div className="grid grid-cols-1 gap-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Suggested</div>
          {STYLE_PRESETS.map((preset) => (
            <StudioCard
              key={preset.label}
              title={preset.label}
              icon={<preset.icon size={16} className="text-gray-700" />}
              color={preset.color}
              onClick={() => openDialog(preset.label)}
            />
          ))}

          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-4 mb-1">Saved Notes</div>
          {status === 'loading' ? (
            <div className="py-4 text-xs text-gray-400">加载中...</div>
          ) : null}
          {status === 'error' ? (
            <div className="py-4 text-xs text-red-500">加载失败</div>
          ) : null}
          {status === 'idle' && items.length === 0 ? (
            <div className="py-4 text-xs text-gray-400">暂无创作记录</div>
          ) : null}
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (onOpenCreation) {
                  onOpenCreation(item.id);
                  return;
                }
                router.push(`/project/${projectId}/creation/${item.id}`);
              }}
              className="p-4 bg-yellow-50/50 border border-yellow-100 rounded-xl text-left hover:shadow-sm transition-shadow"
            >
              <h4 className="font-medium text-gray-800 text-sm mb-1">{item.title}</h4>
              <p className="text-xs text-gray-500 line-clamp-2">{item.style}</p>
              <div className="text-[10px] text-gray-400 mt-2">{item.date}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="absolute bottom-6 right-6">
        <button
          onClick={() => openDialog()}
          className="flex items-center gap-2 px-4 py-3 bg-gray-900 hover:bg-black text-white rounded-2xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
        >
          <PenTool size={18} />
          <span className="font-medium text-sm">Add Note</span>
        </button>
      </div>

      <CreationStartDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        projectId={projectId}
        initialStyle={dialogStyle}
        onCreated={handleCreated}
      />
    </div>
  );
}
